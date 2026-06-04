import {
  runLlmFileTask,
  type LlmFileTask,
  type LlmFileTaskResult,
} from "./llm-file-discovery";

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

const SYSTEM_PROMPT = `You identify internationalization (i18n) files in a codebase.

An i18n file stores user-facing UI copy (button labels, error messages, headings, etc.) keyed by identifiers, intended to be read by an i18n library (i18next, react-intl, vue-i18n, Lingui, gettext, Ditto, Rails i18n, Spring/Java ResourceBundle, …). Translations of the same content in other locales also count.

NOT i18n files (do not include):
- Build / tool configs (package.json, tsconfig, eslint, prettier, babel, vite, webpack, vercel, nx, turbo)
- Type-checker configs (pyrightconfig, mypy.ini)
- Plugin / app manifests (plugin.json, hak.json, manifest.json, capacitor.config.json, app.json)
- Schema files (*.schema.json, JSON Schema documents, OpenAPI / Swagger specs)
- Database / infrastructure configs (database.yml, cable.yml, docker-compose.yml, helm Chart.yaml)
- API request/response fixtures, test data, mock responses, eval prompts
- LLM prompt fragments, model configs
- CMS exports / content snapshots that happen to be all strings
- Plain config files (auth_config.json, bruno.json, theme files)
- API coverage reports, benchmark scenarios
- Java/JVM application config: application.properties, log4j.properties / log4j2.properties, gradle.properties, build.properties, version.properties. These are KEY=VALUE settings (host names, ports, thread pools, log levels) — not user-facing copy

Java .properties files ARE i18n when they hold UI strings keyed by message id (messages_en.properties, labels.properties, ApplicationResources_fr.properties, the content reads like sentences/labels rather than config values).

Use both the file path and the content preview. The path is the strongest signal — files under \`locales/\`, \`i18n/\`, \`translations/\`, \`messages/\`, \`lang/\`, etc., or with names like \`en.json\` / \`fr.yaml\` / \`messages.en.po\` / \`messages_de.properties\`, are almost always i18n files. Custom layouts (e.g. \`<name>___<locale>.json\`) are also valid when the content matches.

Return ONLY the paths that ARE i18n files.`;

// All extensions the i18n discovery pass considers. The walker uses the same
// set to decide which files are LLM-gated vs. dispatched straight to the
// language registry, so this is the single source of truth.
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

// Subset that's single-purpose enough to skip the LLM round trip.
const AUTO_INCLUDE_EXTENSIONS: ReadonlySet<string> = new Set([
  ".po",
  ".arb",
  ".xliff",
  ".xlf",
  ".resx",
  ".resw",
]);

export const I18N_FILES_TASK: LlmFileTask = {
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
  systemPrompt: SYSTEM_PROMPT,
};

export async function findI18nFiles(
  rootPath: string
): Promise<LlmFileTaskResult> {
  return runLlmFileTask(rootPath, I18N_FILES_TASK);
}
