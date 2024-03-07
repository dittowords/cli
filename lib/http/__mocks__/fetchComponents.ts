import { FetchComponentResponse } from "../fetchComponents";

export const MOCK_COMPONENTS_RESPONSE: FetchComponentResponse = {
  "component-1": {
    name: "Example Component 1",
    text: "This is example component text.",
    status: "NONE",
    folder: null,
  },
  "component-2": {
    name: "Example Component 2",
    text: "This is example component text.",
    status: "NONE",
    folder: null,
  },
};

export async function fetchComponents(
  _options: {
    componentFolder?: string;
  } = {}
): Promise<FetchComponentResponse> {
  return MOCK_COMPONENTS_RESPONSE;
}
