import fs from "fs/promises";
import { globby } from "globby";
import path from "path";

import {
  extractAndroidLocaleFromPath,
  extractIosLocaleFromPath,
  extractLocaleFromPath,
  findI18nFiles,
  I18N_FILE_EXTENSIONS,
} from "./lang/i18n-file-discovery";
import type { FileDiscoveryStats } from "./lang/file-discovery";
import {
  findI18nLanguageForExt,
  findLanguageForFile,
  REGEX_FALLBACK_ID,
  type Language,
} from "./lang/registry";

// Paths we never scan regardless of .gitignore: build artifacts, vendored
// dependencies, minified bundles, and test/fixture/story trees.
const HARDCODED_IGNORES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/dist-*/**",
  "**/build/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/.svelte-kit/**",
  "**/coverage/**",
  "**/out/**",
  "**/.turbo/**",
  "**/.cache/**",
  "**/vendor/**",
  "**/vendored/**",
  "**/third_party/**",
  "**/third-party/**",
  "**/*.min.js",
  "**/*.min.css",
  "**/*.bundle.js",
  "**/__tests__/**",
  "**/__mocks__/**",
  "**/__snapshots__/**",
  "**/test/**",
  "**/tests/**",
  "**/androidTest/**",
  "**/androidTest*/**",
  "**/UnitTests/**",
  "**/spec/**",
  "**/e2e/**",
  "**/cypress/**",
  "**/playwright/**",
  "**/*.test.*",
  "**/*.spec.*",
  "**/*Test.kt",
  "**/*Tests.kt",
  "**/*Test.swift",
  "**/*Tests.swift",
  "**/*.stories.*",
  "**/*_test.go",
  "**/*_test.py",
  "**/test_*.py",
  "**/*_spec.rb",
  // Generated test/fixture / benchmark / evaluation data that often
  // contains all-strings JSON shapes (n8n's per-node `__schema__/`,
  // evaluation prompts, benchmark scenarios) which would otherwise be
  // misread as i18n catalogs.
  "**/__schema__/**",
  "**/__fixtures__/**",
  "**/benchmark/**",
  "**/benchmarks/**",
  "**/evaluations/**",
  "**/evals/**",
];

// Files whose mean line length exceeds this are treated as minified/bundled
// output and skipped wholesale.
const MAX_MEAN_LINE_LENGTH = 500;

export interface DiscoveredFile {
  absPath: string;
  relPath: string;
  language: Language;
  source: string;
  languageLabel: string;
  // Locale key derived from the path of an i18n-discovered file
  // ("en", "de-DE", …). Null for source files and locale-less catalogs.
  localeKey: string | null;
}

export interface WalkResult {
  files: DiscoveredFile[];
  filesSkippedMinified: number;
  i18nFileDiscovery: FileDiscoveryStats | null;
}

export async function walkCodebase(rootPath: string): Promise<WalkResult> {
  const resolved = path.resolve(rootPath);

  const [paths, i18nFileResult] = await Promise.all([
    globby(["**/*"], {
      cwd: resolved,
      gitignore: true,
      absolute: true,
      onlyFiles: true,
      ignore: HARDCODED_IGNORES,
      followSymbolicLinks: false,
      suppressErrors: true,
    }),
    runI18nFileDiscovery(resolved),
  ]);

  const files: DiscoveredFile[] = [];
  let filesSkippedMinified = 0;

  for (const absPath of paths) {
    const ext = path.extname(absPath).toLowerCase();
    // i18nFileResult.paths comes from globby (always POSIX) so normalize
    // path.relative output, which uses path.sep, before lookup.
    const relPath = path.relative(resolved, absPath).split(path.sep).join("/");

    let language: Language | null;
    let localeKey: string | null = null;
    if (I18N_FILE_EXTENSIONS.has(ext)) {
      // Skip i18n-shaped extensions the heuristic didn't confirm.
      // If discovery itself failed the set is null and we drop everything
      // in this branch.
      if (!i18nFileResult || !i18nFileResult.paths.has(relPath)) continue;
      language = findI18nLanguageForExt(ext);
      if (!language) continue;
      localeKey = extractLocaleFromPath(relPath);
    } else {
      const found = findLanguageForFile({ ext, relPath });
      if (!found) continue;
      language = found;
      localeKey = platformLocaleForPath(language.id, relPath);
    }

    let source: string;
    try {
      source = await fs.readFile(absPath, "utf8");
    } catch {
      continue;
    }
    if (looksMinified(source)) {
      filesSkippedMinified++;
      continue;
    }

    files.push({
      absPath,
      relPath,
      language,
      source,
      languageLabel: labelFor(language, ext),
      localeKey,
    });
  }

  return {
    files,
    filesSkippedMinified,
    i18nFileDiscovery: i18nFileResult?.stats ?? null,
  };
}

async function runI18nFileDiscovery(
  resolved: string
): Promise<{ paths: Set<string>; stats: FileDiscoveryStats } | null> {
  try {
    return await findI18nFiles(resolved);
  } catch (e) {
    process.stderr.write(
      `[ptd extract] i18n-file discovery failed: ${(e as Error).message}\n`
    );
    return null;
  }
}

// Platform resource files carry their locale in path conventions rather
// than locale-token filenames: Android `res/values-<qualifier>/`, iOS
// `<locale>.lproj/`. `.xcstrings` holds every locale in one file, so its
// locale is stamped per hit by the extractor instead of here.
function platformLocaleForPath(
  languageId: string,
  relPath: string
): string | null {
  if (languageId === "android_resources") {
    return extractAndroidLocaleFromPath(relPath);
  }
  if (languageId === "ios_strings" || languageId === "ios_stringsdict") {
    return extractIosLocaleFromPath(relPath);
  }
  return null;
}

function labelFor(language: Language, ext: string): string {
  if (language.id !== REGEX_FALLBACK_ID) return language.id;
  return ext.slice(1) || "unknown";
}

function looksMinified(source: string): boolean {
  if (source.length < 1024) return false;
  let newlines = 0;
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === 10) newlines++;
  }
  return source.length / (newlines + 1) > MAX_MEAN_LINE_LENGTH;
}
