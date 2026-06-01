import type { Rule } from "../types";

// HTML/JSX/Vue attribute names whose values are exclusively human-readable
// copy. Symmetric counterpart to NON_TEXT_ATTR_NAMES in drop.ts: those are
// always-non-text attrs (dropped); these are always-copy attrs (accepted).
const COPY_ATTR_NAMES: ReadonlySet<string> = new Set([
  "placeholder",
  "alt",
  "aria-label",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "title",
  "summary",
]);

// HTML elements whose text content is unambiguously user-facing copy.
// Allowlist (rather than denylist) so component tags like `<Foo>` and
// generic containers like `<div>` fall through to the LLM — components
// can have arbitrary semantics (e.g. `<Trans>` in react-i18next treats
// children as a translation key), and `<div>` is too generic.
//
// `text` is included to cover two distinct cases that happen to share
// the same lowercased tag name:
//   - React Native's `<Text>...</Text>` (the canonical RN copy holder)
//   - SVG's `<text>...</text>` (renders the inner text inside the SVG)
// Both are unambiguous copy.
const COPY_TAGS: ReadonlySet<string> = new Set([
  // Headings + sectioning
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "blockquote",
  // Lists / tables
  "li",
  "dd",
  "dt",
  "td",
  "th",
  "caption",
  // Forms / interactive
  "button",
  "a",
  "label",
  "option",
  "legend",
  "summary",
  // Figures
  "figcaption",
  // Inline phrasing
  "span",
  "text",
  "em",
  "strong",
  "b",
  "i",
  "small",
  "mark",
  "q",
  "cite",
  "dfn",
  "abbr",
  "time",
  "sub",
  "sup",
  "ins",
  "del",
]);

export const COMMON_ACCEPT_RULES: Rule[] = [
  {
    name: "resource_value",
    // Every entry in a localization resource file (.strings, .stringsdict,
    // .xcstrings, strings.xml) is intentional product copy, including the
    // entries the developer marked `translatable="false"`. Those are still
    // user-facing strings (app names, brand strings, accessibility labels);
    // the flag just opts them out of localization, not out of the UI.
    match: ({ candidate }) => candidate.detection_kind === "resource_value",
  },
  {
    name: "markup_attr_copy",
    match: ({ candidate }) =>
      candidate.detection_kind === "markup_attr" &&
      candidate.context_identifiers.length > 0 &&
      COPY_ATTR_NAMES.has(candidate.context_identifiers[0].toLowerCase()),
  },
  {
    name: "markup_text_safe",
    // JSX/Vue text content (`<button>Save</button>`, `<p>...</p>`) is
    // unambiguous copy when the wrapping tag is a known text-bearing
    // HTML element. Components, fragments, generic containers (`<div>`),
    // and code-bearing tags fall through to the LLM.
    match: ({ context }) =>
      context.parentRole === "markup_text" && context.parentTag !== undefined && COPY_TAGS.has(context.parentTag),
  },
];
