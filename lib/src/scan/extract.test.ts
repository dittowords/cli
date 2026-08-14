import { assignOccurrenceIndexes } from "./extract";

const hit = (value: string, line: number, column = 1) => ({
  value,
  location: { line, column },
});

describe("assignOccurrenceIndexes", () => {
  test("numbers repeats in source order", () => {
    const hits = [hit("Save", 40, 8), hit("Cancel", 12), hit("Save", 9)];

    expect(assignOccurrenceIndexes(hits)).toEqual([1, 0, 0]);
  });

  test("numbers repeats regardless of the order hits arrive in", () => {
    const sourceOrder = [hit("Save", 9), hit("Save", 22), hit("Save", 40)];
    const kindGrouped = [hit("Save", 40), hit("Save", 9), hit("Save", 22)];

    expect(assignOccurrenceIndexes(sourceOrder)).toEqual([0, 1, 2]);
    expect(assignOccurrenceIndexes(kindGrouped)).toEqual([2, 0, 1]);
  });

  test("is stable when lines shift", () => {
    const before = [hit("Save", 9), hit("Save", 40, 8)];
    const after = [hit("Save", 11), hit("Save", 42, 8)];

    expect(assignOccurrenceIndexes(after)).toEqual(
      assignOccurrenceIndexes(before)
    );
  });

  test("counts each distinct value separately", () => {
    const hits = [hit("Save", 1), hit("Cancel", 2), hit("Save", 3)];

    expect(assignOccurrenceIndexes(hits)).toEqual([0, 0, 1]);
  });

  test("orders hits on the same line by column", () => {
    const hits = [hit("Save", 5, 30), hit("Save", 5, 10)];

    expect(assignOccurrenceIndexes(hits)).toEqual([1, 0]);
  });

  test("returns an empty result for no hits", () => {
    expect(assignOccurrenceIndexes([])).toEqual([]);
  });
});
