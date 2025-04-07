import { IVariant } from "../fetchVariants";

export const MOCK_VARIANTS_RESPONSE: IVariant[] = [
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

export async function fetchVariants(
  _source: any,
  _options: any = {}
): Promise<IVariant[] | null> {
  return MOCK_VARIANTS_RESPONSE;
}
