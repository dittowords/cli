import { IVariant } from "../fetchVariants";

export async function fetchVariants(
  source: any,
  options: any = {}
): Promise<IVariant[] | null> {
  return [
    {
      name: "Example Variant 1",
      description: "This is example variant 1.",
      apiID: "example-variant-1",
    },
    {
      name: "Example Variant 2",
      description: "This is example variant 2.",
      apiID: "example-variant-2",
    },
  ];
}
