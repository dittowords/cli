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

// BCP-47 locale token: 2-letter language code, optionally followed by
// separator + 2-4 char region/script tag (e.g. en, fr, de-DE, zh_CN).
const LOCALE_TOKEN_RE = /^[a-z]{2}([_-][a-zA-Z]{2,4})?$/i;

// Locale as an underscore-delimited suffix in a filename stem, e.g.
// messages_en, ApplicationResources_fr, labels_de-DE.
const LOCALE_UNDERSCORE_SUFFIX_RE = /^.+_[a-z]{2}([_-][a-zA-Z]{2,4})?$/i;

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
    if (LOCALE_TOKEN_RE.test(part)) return true;
    // Whole dot-segment ends with _<locale>: "messages_en", "labels_fr"
    if (LOCALE_UNDERSCORE_SUFFIX_RE.test(part)) return true;
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
