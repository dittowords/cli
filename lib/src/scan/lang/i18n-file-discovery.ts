import {
  runFileDiscoveryTask,
  type FileDiscoveryTask,
  type FileDiscoveryResult,
} from "./file-discovery";

const NEVER_FILENAMES: ReadonlySet<string> = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "jsconfig.json",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
]);

const NEVER_PATTERNS: readonly RegExp[] = [
  /^tsconfig\.[^/]+\.json$/i,
  /\.schema\.json$/i,
  /\.lock$/i,
];

// All extensions the i18n discovery pass considers. The walker uses the same
// set to decide which files are dispatched straight to the language registry,
// so this is the single source of truth.
export const I18N_FILE_EXTENSIONS: ReadonlySet<string> = new Set([
  ".json",
  ".yaml",
  ".yml",
  ".po",
  ".properties",
  ".arb",
  ".xliff",
  ".xlf",
  ".resx",
  ".resw",
]);

// Subset that's single-purpose enough to skip the heuristic round trip.
const AUTO_INCLUDE_EXTENSIONS: ReadonlySet<string> = new Set([
  ".po",
  ".arb",
  ".xliff",
  ".xlf",
  ".resx",
  ".resw",
]);

// ---------------------------------------------------------------------------
// Heuristic i18n detection
// ---------------------------------------------------------------------------

// Directory names that strongly indicate a file is part of an i18n system.
const I18N_DIR_SEGMENTS: ReadonlySet<string> = new Set([
  "locales",
  "locale",
  "i18n",
  "translations",
  "translation",
  "messages",
  "lang",
  "languages",
  "strings",
  "nls",
  "intl",
  "l10n",
]);

// Exact ISO 639-1 two-letter language codes. Using a set rather than a regex
// avoids false positives for common technical abbreviations (db, ui, go, ai…)
// that also happen to be two letters but are not valid locale codes.
const ISO_639_1: ReadonlySet<string> = new Set([
  "af", "sq", "am", "ar", "hy", "az", "eu", "be", "bn", "bs", "bg", "my",
  "ca", "zh", "hr", "cs", "da", "nl", "en", "et", "fi", "fr", "ka", "de",
  "el", "gu", "ht", "ha", "he", "hi", "hu", "is", "id", "ga", "it", "ja",
  "kn", "kk", "km", "ko", "ku", "ky", "lo", "lv", "lt", "lb", "mk", "mg",
  "ms", "ml", "mt", "mi", "mr", "mn", "ne", "nb", "nn", "no", "or", "ps",
  "fa", "pl", "pt", "pa", "ro", "ru", "sm", "sr", "sn", "si", "sk", "sl",
  "so", "es", "sw", "sv", "tl", "tg", "ta", "tt", "te", "th", "bo", "tr",
  "tk", "uk", "ur", "ug", "uz", "vi", "cy", "xh", "yi", "yo", "zu",
]);

// BCP-47 subtag: separator + 2-4 char region/script (e.g. -DE, _Latn).
// Only used when the token already contains a separator, so no bare-code
// false positives are possible here.
const LOCALE_SUBTAG_RE = /^[a-z]{2}[_-][a-zA-Z]{2,4}$/i;

function isLocaleToken(s: string): boolean {
  if (s.includes("-") || s.includes("_")) {
    return LOCALE_SUBTAG_RE.test(s) && ISO_639_1.has(s.slice(0, 2).toLowerCase());
  }
  return ISO_639_1.has(s.toLowerCase());
}

// Locale as an underscore-delimited suffix in a filename stem, e.g.
// messages_en, ApplicationResources_fr, labels_de-DE.
const LOCALE_UNDERSCORE_SUFFIX_RE = /^.+_([a-z]{2}([_-][a-zA-Z]{2,4})?)$/i;

// Derives the locale key for a per-locale i18n file from its path, e.g.
// "locales/de-DE/common.json" -> "de-DE", "messages.en.json" -> "en",
// "ApplicationResources_fr.properties" -> "fr". The filename is checked
// before directory segments since it's the more specific signal, and
// directories are checked deepest-first. Returns null when no path token
// reads as a locale (e.g. a single-file catalog like "translations.json").
export function extractLocaleFromPath(relPath: string): string | null {
  const parts = relPath.split("/");
  const filename = parts[parts.length - 1];

  // Filename dot-segments, scanned right-to-left so the conventional
  // trailing locale ("messages.en.json") wins over earlier tokens.
  const stemParts = filename.split(".");
  if (stemParts.length >= 2) {
    stemParts.pop(); // drop the file extension
    for (let i = stemParts.length - 1; i >= 0; i--) {
      const part = stemParts[i];
      if (isLocaleToken(part)) return part;
      const m = part.match(LOCALE_UNDERSCORE_SUFFIX_RE);
      if (m && isLocaleToken(m[1])) return m[1];
    }
  }

  // Directory segments, deepest first ("locales/en/common.json").
  for (let i = parts.length - 2; i >= 0; i--) {
    if (isLocaleToken(parts[i])) return parts[i];
  }
  return null;
}

// Locale from an Android resource qualifier: `res/values-fr/` -> "fr",
// `res/values-fr-rCA/` -> "fr-CA" (the "r" region prefix is normalized
// away), `res/values-b+sr+Latn/` -> "sr-Latn" (BCP-47 form). Non-locale
// qualifiers (night, v21, sw600dp, mcc310, …) are skipped, so the bare
// `res/values/` default-locale dir and qualifier-only dirs return null.
export function extractAndroidLocaleFromPath(relPath: string): string | null {
  const m = relPath.match(/(?:^|\/)res\/values-([^/]+)\//i);
  if (!m) return null;
  const tokens = m[1].split("-");
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // BCP-47 qualifier: a single dash-token shaped like "b+sr+Latn".
    if (token.toLowerCase().startsWith("b+")) {
      const parts = token.split("+").slice(1);
      if (parts.length > 0 && ISO_639_1.has(parts[0].toLowerCase())) {
        return parts.join("-");
      }
      continue;
    }
    if (ISO_639_1.has(token.toLowerCase())) {
      const region = tokens[i + 1];
      if (region && /^r[A-Za-z]{2,3}$/.test(region)) {
        return `${token}-${region.slice(1)}`;
      }
      return token;
    }
  }
  return null;
}

// Locale from an iOS localization bundle: `fr.lproj/Localizable.strings`
// -> "fr", `pt-BR.lproj/` -> "pt-BR", `zh-Hans.lproj/` -> "zh-Hans".
// `Base.lproj/` is the development-language placeholder, not a locale,
// and falls out naturally ("base" is not an ISO language code).
export function extractIosLocaleFromPath(relPath: string): string | null {
  const m = relPath.match(/(?:^|\/)([^/]+)\.lproj\//i);
  if (!m) return null;
  const stem = m[1];
  const lang = stem.split(/[-_]/)[0];
  if (!ISO_639_1.has(lang.toLowerCase())) return null;
  // Allow multi-subtag tags (zh-Hant-TW) that the stricter single-subtag
  // check used for filename tokens would reject.
  if (!/^[a-z]{2}(?:[_-][a-zA-Z0-9]{2,8})*$/i.test(stem)) return null;
  return stem;
}

// JSON keys that appear in non-i18n config files (package.json, etc.).
// A file containing any of these at the root level is almost certainly not i18n.
const JSON_CONFIG_KEY_RE =
  /"(?:version|dependencies|devDependencies|scripts|name|peerDependencies|engines|repository|license)"\s*:/;

function filenameHasLocaleToken(filename: string): boolean {
  // Split by dots, remove the final extension, then check each dot-segment.
  // We use dots (not underscores) as primary delimiters so that we only
  // match whole tokens: "messages.en.json" → check "messages" and "en".
  const parts = filename.split(".");
  if (parts.length < 2) return false;
  parts.pop(); // drop the file extension

  for (const part of parts) {
    // Whole dot-segment is a locale: "en", "de-DE", "zh_CN"
    if (isLocaleToken(part)) return true;
    // Whole dot-segment ends with _<locale>: "messages_en", "labels_fr"
    const m = part.match(LOCALE_UNDERSCORE_SUFFIX_RE);
    if (m && isLocaleToken(m[1])) return true;
  }
  return false;
}

// Content-based checks — used only when path/filename give no clear signal.

function looksLikeI18nJson(preview: string): boolean {
  if (!preview.trimStart().startsWith("{")) return false;
  if (JSON_CONFIG_KEY_RE.test(preview)) return false;

  // Count "key": "string value" vs "key": <non-string>
  const stringPairs = (preview.match(/"[^"\n]+"\s*:\s*"[^"\n]*"/g) ?? [])
    .length;
  const nonStringPairs = (
    preview.match(/"[^"\n]+"\s*:\s*(?:\d|true|false|null|\[|\{)/g) ?? []
  ).length;

  if (stringPairs < 3 || stringPairs <= nonStringPairs) return false;
  // Require at least one value that reads like a sentence/label (>10 chars).
  return (preview.match(/"[^"\n]+"\s*:\s*"[^"\n]{10,}"/g) ?? []).length > 0;
}

function looksLikeI18nYaml(preview: string): boolean {
  // Reject clear infrastructure/config YAML patterns.
  if (
    /^(?:host|port|database|username|password|server|adapter|pool)\s*:/im.test(
      preview
    )
  )
    return false;
  // Require several lines that look like "key: sentence value".
  const sentenceLines = (
    preview.match(/^\s*[\w.]+\s*:\s*["']?[A-Za-z][^{\[\n]{8,}/gm) ?? []
  ).length;
  return sentenceLines >= 3;
}

function looksLikeI18nProperties(preview: string): boolean {
  const propLines = preview.match(/^[\w.]+\s*[=:]\s*.+$/gm) ?? [];
  if (propLines.length < 3) return false;
  // Require at least 2 values that contain spaces (natural language, not config).
  const sentenceLike = propLines.filter((line) => {
    const sep = line.search(/[=:]/);
    const value = line.slice(sep + 1).trim();
    return value.includes(" ") && value.length > 8;
  });
  return sentenceLike.length >= 2;
}

function isLikelyI18nFile(relPath: string, preview: string): boolean {
  const parts = relPath.split("/");
  const filename = parts[parts.length - 1];
  const extDot = filename.lastIndexOf(".");
  const ext = extDot === -1 ? "" : filename.slice(extDot).toLowerCase();

  // 1. File lives under a known i18n directory segment.
  for (const seg of parts.slice(0, -1)) {
    if (I18N_DIR_SEGMENTS.has(seg.toLowerCase())) return true;
  }

  // 2. Any dot-separated token in the filename is a locale code.
  if (filenameHasLocaleToken(filename)) return true;

  // 3. Content-based fallback for ambiguous filenames.
  if (ext === ".json") return looksLikeI18nJson(preview);
  if (ext === ".yaml" || ext === ".yml") return looksLikeI18nYaml(preview);
  if (ext === ".properties") return looksLikeI18nProperties(preview);
  return false;
}

export const I18N_FILES_TASK: FileDiscoveryTask = {
  taskName: "i18n files",
  globs: [...I18N_FILE_EXTENSIONS].map((ext) => `**/*${ext}`),
  preFilter: (base) =>
    NEVER_FILENAMES.has(base) || NEVER_PATTERNS.some((re) => re.test(base)),
  autoInclude: (relPath) => {
    const dot = relPath.lastIndexOf(".");
    return (
      dot !== -1 &&
      AUTO_INCLUDE_EXTENSIONS.has(relPath.slice(dot).toLowerCase())
    );
  },
  heuristicMatch: isLikelyI18nFile,
};

export async function findI18nFiles(
  rootPath: string
): Promise<FileDiscoveryResult> {
  return runFileDiscoveryTask(rootPath, I18N_FILES_TASK);
}
