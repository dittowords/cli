import type { FetchComponentFoldersResponse } from "../fetchComponentFolders";

export async function fetchComponentFolders(
  _options: {
    showSampleData?: boolean;
  } = {}
): Promise<FetchComponentFoldersResponse> {
  if (_options.showSampleData) {
    return {
      example_folder: "Example Folder",
      example_folder_sample: "Sample Example Folder",
    };
  }

  return {
    example_folder: "Example Folder",
  };
}
