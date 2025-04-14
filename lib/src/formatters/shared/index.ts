export type Constructor<T = {}> = new (...args: any[]) => T;

type Mixin<TBase extends Constructor, TReturn extends Constructor> = (
  base: TBase
) => TReturn;

// Overloads for up to 5 mixins
export function applyMixins<TBase extends Constructor>(base: TBase): TBase;
export function applyMixins<TBase extends Constructor, T1 extends Constructor>(
  base: TBase,
  m1: Mixin<TBase, T1>
): T1;
export function applyMixins<
  TBase extends Constructor,
  T1 extends Constructor,
  T2 extends Constructor
>(base: TBase, m1: Mixin<TBase, T1>, m2: Mixin<T1, T2>): T2;
export function applyMixins<
  TBase extends Constructor,
  T1 extends Constructor,
  T2 extends Constructor,
  T3 extends Constructor
>(base: TBase, m1: Mixin<TBase, T1>, m2: Mixin<T1, T2>, m3: Mixin<T2, T3>): T3;
export function applyMixins<
  TBase extends Constructor,
  T1 extends Constructor,
  T2 extends Constructor,
  T3 extends Constructor,
  T4 extends Constructor
>(
  base: TBase,
  m1: Mixin<TBase, T1>,
  m2: Mixin<T1, T2>,
  m3: Mixin<T2, T3>,
  m4: Mixin<T3, T4>
): T4;
export function applyMixins<
  TBase extends Constructor,
  T1 extends Constructor,
  T2 extends Constructor,
  T3 extends Constructor,
  T4 extends Constructor,
  T5 extends Constructor
>(
  base: TBase,
  m1: Mixin<TBase, T1>,
  m2: Mixin<T1, T2>,
  m3: Mixin<T2, T3>,
  m4: Mixin<T3, T4>,
  m5: Mixin<T4, T5>
): T5;

// Implementation
export function applyMixins(
  base: Constructor,
  ...mixins: Mixin<Constructor, Constructor>[]
): Constructor {
  if (mixins.length > 5) {
    throw new Error("Maximum of 5 mixins supported");
  }
  return mixins.reduce((acc, mixin) => mixin(acc), base);
}
