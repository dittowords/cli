/**
 * How many export requests may be in flight at once.
 *
 * Every output format fetches one rendered file per project/variant permutation, so a
 * workspace with many projects and variants can easily produce a large number of requests for a
 * single `ditto pull`. Firing them all at once would be fast for the CLI but hostile to the
 * API, so they run through a bounded worker pool instead.
 */
export const EXPORT_REQUEST_CONCURRENCY = 5;

/**
 * Runs `task` over every item with at most `limit` running concurrently.
 *
 * Results come back in the same order as `items`, regardless of the order they finish in.
 * Behaves like `Promise.all` on failure: the first rejection propagates. Workers already
 * awaiting a request will finish it, but no further items are picked up.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  task: (item: T) => Promise<R>,
  limit: number = EXPORT_REQUEST_CONCURRENCY
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let failed = false;

  const worker = async () => {
    while (!failed) {
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        results[index] = await task(items[index]);
      } catch (e) {
        failed = true;
        throw e;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );

  return results;
}
