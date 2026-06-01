import type { Rule } from "../types";

// `(receiver, method)` pairs whose first string argument is user-facing
// copy. These are the standard Android UI surfaces. Receiver match is
// strict (callee + calleeMember, bare identifier) so an unrelated
// variable named `Toast` doesn't fire. The factory signatures
// (`Toast.makeText(ctx, text, duration)`, `Snackbar.make(view, text, duration)`)
// place the only String-typed parameter at arg index 1, so any string
// literal at these call sites is necessarily the message.
const ANDROID_UI_FACTORY_CALLS: ReadonlyArray<readonly [string, string]> = [
  ["Toast", "makeText"],
  ["Snackbar", "make"],
];

export const KOTLIN_ACCEPT_RULES: Rule[] = [
  {
    name: "compose_text",
    // Jetpack Compose's `Text(...)` composable takes a String literal that
    // is rendered directly as UI. Unlike SwiftUI's Text (which auto-looks
    // up against Localizable bundles via LocalizedStringKey), Compose
    // performs no resource lookup — the literal IS the displayed copy.
    //
    // Gated on the `android` framework token so a non-Android Kotlin
    // project that happens to define its own `Text(...)` function doesn't
    // get every constructor argument auto-classified as UI copy.
    //
    // We match only the bare-identifier call `Text("...")`, not
    // `Text(stringResource(...))` (which doesn't put a literal in the
    // first arg position) and not method calls like `myWidget.Text(...)`.
    match: ({ candidate, context }) =>
      candidate.framework.includes("android") && context.callee === "Text" && context.calleeMember === undefined,
  },
  {
    name: "android_ui_factory",
    // `Toast.makeText(ctx, "Saved", LENGTH_SHORT)`, `Snackbar.make(view, "...", ...)`.
    // Receiver is a bare type identifier; the method is a known factory.
    match: ({ context }) => {
      if (!context.callee || !context.calleeMember) return false;
      for (const [receiver, method] of ANDROID_UI_FACTORY_CALLS) {
        if (context.callee === receiver && context.calleeMember === method) return true;
      }
      return false;
    },
  },
];
