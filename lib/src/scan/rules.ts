import type {
  DittoScanDetectionKind,
  DittoScanEnclosingContext,
} from "./types";

// Unambiguous non-text value shapes. A pattern belongs here only if there
// is effectively zero chance a real UI string could match it.
const NON_TEXT_SHAPES: RegExp[] = [
  /^https?:\/\//i, // URLs
  /^(?:mailto|tel|file|ws|wss|ftp|data|blob|javascript):/i, // other URI schemes
  /^\.{1,2}\//, // relative paths ./foo, ../bar
  /^\/[A-Za-z0-9_\-./@]+$/, // absolute paths / URL paths
  /^[A-Za-z0-9_\-]+(?:\.[A-Za-z0-9_\-]+)+\/[A-Za-z0-9_./\-@]+$/, // package paths: github.com/foo/bar
  /^[A-Za-z0-9_.\-]+(?:\/[A-Za-z0-9_.\-]+){2,}$/, // 3+ slash-separated path segments
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // uuid
  // Hex color. Allow 3, 4, 6, or 8 digits with a leading `#`, but only 6
  // or 8 digits without `#`, so short English words like "dead", "face",
  // or "cafe" don't get filtered out.
  /^(?:#[0-9a-fA-F]{3,4}|#?[0-9a-fA-F]{6}|#?[0-9a-fA-F]{8})$/,
  /^rgba?\(/i, // rgb(...) / rgba(...)
  /^v?\d+\.\d+(?:\.\d+)?(?:[-+][\w.]+)?$/, // version
  /^[\s\p{P}\p{S}]+$/u, // only whitespace + punctuation/symbols
  // Pure printf/Cocoa format directives with no surrounding readable
  // text: `%@`, `%d`, `%#@items@`, `%1$#@count@`, `%#@a@%#@b@`. Used by
  // iOS .stringsdict NSStringLocalizedFormatKey values (Apple's plural
  // template syntax) and similar format-only strings.
  //
  // Matches an unbroken chain of directives. As soon as there's
  // surrounding text (a space, punctuation, real word characters
  // outside an @var@ name) the chain breaks and the string is treated
  // as displayable copy. Examples:
  //   "%@"                  match (drop)
  //   "%1$#@count@"         match (drop)
  //   "%#@a@%#@b@"          match (drop)
  //   "%d items"            no match (real text)
  //   "%#@count@ remaining" no match (real text)
  /^(?:%(?:\d+\$)?(?:#?@\w+@|[hl]{0,2}[%@a-zA-Z]))+$/,
  // Vue / Angular interpolation that resolves to a variable with no
  // literal copy of its own: `{{ title }}`, `{{ datetime }}`,
  // `{{ user.name }}`. Treated as not-translatable here.
  //
  // We require the inner expression to contain no quote characters so
  // `{{ x ?? 'fallback text' }}` — which carries a literal fallback
  // worth translating — is preserved.
  /^\s*\{\{[^'"`{}]*\}\}\s*$/,
];

const EXCLUDED_KINDS: ReadonlySet<DittoScanDetectionKind> =
  new Set<DittoScanDetectionKind>([
    "import",
    "regex_pattern",
    "object_key",
    "index_access",
    "type_tag",
  ]);

// HTML/JSX/Vue attribute names whose value is structural, identifying, or
// stylistic — not human-readable text. Text-bearing attrs like alt, title,
// placeholder, aria-label, summary, value are deliberately absent.
const NON_TEXT_ATTR_NAMES: ReadonlySet<string> = new Set([
  "class",
  "classname",
  "style",
  "href",
  "src",
  "srcset",
  "action",
  "formaction",
  "poster",
  "id",
  "name",
  "key",
  "slot",
  "for",
  "htmlfor",
  "type",
  "role",
  "rel",
  "target",
  "xmlns",
  "lang",
  "dir",
  "hreflang",
  "data-testid",
  "data-test",
  "data-test-id",
  "data-cy",
  "data-qa",
  // SVG painting + geometry. Stroke/fill/transform/path/points are
  // already here; these cover the remaining numeric/structural attrs
  // commonly seen in inline icon JSX.
  "viewbox",
  "d",
  "points",
  "fill",
  "stroke",
  "transform",
  "strokewidth",
  "strokelinecap",
  "strokelinejoin",
  "strokemiterlimit",
  "strokedasharray",
  "strokedashoffset",
  "fillopacity",
  "fillrule",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "width",
  "height",
  "size",
  "sizes",
  // react-i18next translation key — the rendered text comes from
  // locale tables, not this string.
  "i18nkey",
  // SVG masking + clipping.
  "mask",
  "maskunits",
  "clippath",
  "cliprule",
  // ARIA state attributes with fixed value vocabularies (boolean,
  // tri-state, or enum). `aria-label`, `aria-placeholder`,
  // `aria-roledescription`, etc. — the ones that hold actual copy —
  // are deliberately left for the accept rule to pick up.
  "aria-hidden",
  "aria-disabled",
  "aria-expanded",
  "aria-selected",
  "aria-checked",
  "aria-pressed",
  "aria-current",
  "aria-modal",
  "aria-haspopup",
  "aria-busy",
  "aria-live",
  "aria-atomic",
  "aria-relevant",
  // ARIA attributes whose value is an ID reference to another element,
  // not displayed text. Distinct from `aria-label` (and friends) which
  // hold actual copy.
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
  "aria-owns",
  "aria-flowto",
  "aria-activedescendant",
  "aria-errormessage",
  "aria-details",
]);

const MIN_STRING_LENGTH = 2;

// JS / TS / Swift / Kotlin extractors emit `value_raw` with the source
// quote characters preserved (`"hello"`, `'hello'`, `` `hello` ``). The
// LLM payload wants those quotes intact, but for shape-based drop checks
// they get in the way: `^https?://` won't match `"https://..."`. Strip a
// single matching pair before running the shape regexes.
function stripWrappingQuotes(value: string): string {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' || first === "'" || first === "`") && first === last) {
    return value.slice(1, -1);
  }
  return value;
}

export function shouldEmit(
  value: string,
  ctx: DittoScanEnclosingContext
): boolean {
  const trimmed = stripWrappingQuotes(value.trim()).trim();
  if (trimmed.length < MIN_STRING_LENGTH) return false;
  if (NON_TEXT_SHAPES.some((re) => re.test(trimmed))) return false;
  if (EXCLUDED_KINDS.has(ctx.parentRole)) return false;
  if (
    ctx.parentRole === "markup_attr" &&
    NON_TEXT_ATTR_NAMES.has((ctx.identifiers[0] ?? "").toLowerCase())
  )
    return false;
  return true;
}
