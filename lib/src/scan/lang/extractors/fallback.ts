import type { ExtractedHit, LanguageExtractor } from "../types";

/**
 * Regex-based string finder used for any source file that isn't supported by
 * one of our extractors.
 *
 * Scan each line for `"..."`, `'...'`, or `` `...` `` literals
 * and emit them with `parentRole: "other"`. The LLM
 * phase reads `source_context` to decide whether each hit is user-facing.
 *
 * Known limitations - anything caught here is acceptable noise that
 * downstream filters or the LLM will handle:
 *   - Multi-line strings (Python triple-quoted, Go backticks, etc.) get
 *     truncated at the first newline.
 *   - Block comments are not stripped; string-like content inside `\/* *\/`
 *     or `"""..."""` leaks through.
 *   - Line comments are not stripped either — strings inside `# foo`,
 *     `// foo`, `-- foo` leak through. (Stripping these would also drop
 *     real strings like `"#abc"` or `"https://..."`, so we don't bother.)
 *   - Escape sequences inside strings are matched but not interpreted.
 */
const STRING_RE = /(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1/g;

export const fallbackExtractor: LanguageExtractor = {
  async extract({ source }) {
    const out: ExtractedHit[] = [];
    const lines = source.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      STRING_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = STRING_RE.exec(lines[i])) !== null) {
        out.push({
          value: m[2],
          location: { line: i + 1, column: m.index + 1 },
          context: { parentRole: "other", identifiers: [] },
        });
      }
    }

    return out;
  },
};
