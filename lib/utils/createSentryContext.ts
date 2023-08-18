type SentryContext = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Sentry context
 */
export function createSentryContext(obj: unknown) {
  if (typeof obj !== "object") return {};

  const ctx: SentryContext = {};
  for (const key in obj) {
    const k = key as keyof typeof obj;
    const r = obj[k];
    ctx[k] = typeof r === "object" || Array.isArray(r) ? JSON.stringify(r) : r;
  }

  return ctx;
}
