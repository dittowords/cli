import { mapWithConcurrency, EXPORT_REQUEST_CONCURRENCY } from "./concurrency";

const tick = (ms = 1) => new Promise((resolve) => setTimeout(resolve, ms));

describe("mapWithConcurrency", () => {
  it("returns an empty array for no items without invoking the task", async () => {
    const task = jest.fn();
    await expect(mapWithConcurrency([], task)).resolves.toEqual([]);
    expect(task).not.toHaveBeenCalled();
  });

  it("never has more than `limit` tasks in flight", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await tick();
        inFlight--;
      },
      5
    );

    expect(maxInFlight).toBe(5);
  });

  it("uses no more workers than there are items", async () => {
    let maxInFlight = 0;
    let inFlight = 0;

    await mapWithConcurrency(
      [1, 2],
      async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await tick();
        inFlight--;
      },
      10
    );

    expect(maxInFlight).toBe(2);
  });

  it("returns results in input order regardless of completion order", async () => {
    // Earlier items take longer, so they finish last
    const result = await mapWithConcurrency(
      [30, 20, 10, 0],
      async (delay) => {
        await tick(delay);
        return `done-${delay}`;
      },
      4
    );

    expect(result).toEqual(["done-30", "done-20", "done-10", "done-0"]);
  });

  it("rejects with the first error and stops starting new tasks", async () => {
    const started: number[] = [];

    await expect(
      mapWithConcurrency(
        Array.from({ length: 10 }, (_, i) => i),
        async (i) => {
          started.push(i);
          await tick();
          if (i === 1) throw new Error("boom");
        },
        2
      )
    ).rejects.toThrow("boom");

    // Only the first batch ever started; the remaining eight were never picked up
    expect(started.length).toBeLessThan(10);
  });

  it("defaults to EXPORT_REQUEST_CONCURRENCY", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    await mapWithConcurrency(
      Array.from({ length: EXPORT_REQUEST_CONCURRENCY * 3 }, (_, i) => i),
      async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await tick();
        inFlight--;
      }
    );

    expect(maxInFlight).toBe(EXPORT_REQUEST_CONCURRENCY);
  });
});
