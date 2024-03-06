import { FetchComponentResponse } from "../fetchComponents";

export async function fetchComponents(
  _options: {
    componentFolder?: string;
  } = {}
): Promise<FetchComponentResponse> {
  return {
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
}
