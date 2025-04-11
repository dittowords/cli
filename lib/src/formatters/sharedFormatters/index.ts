export type Constructor<T = {}> = new (...args: any[]) => T;

type Mixin<TBase extends Constructor, TReturn extends Constructor> = (
  base: TBase
) => TReturn;

export function applyMixins<
  TBase extends Constructor,
  TMixin extends Constructor
>(base: TBase, mixin: Mixin<TBase, TMixin>): TMixin {
  return mixin(base);
}
