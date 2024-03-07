import type { FetchComponentFoldersResponse } from "../fetchComponentFolders";

export const MOCK_COMPONENT_FOLDERS: FetchComponentFoldersResponse = {
  example_folder: "Example Folder",
};

export const MOCK_COMPONENT_FOLDERS_WITH_SAMPLE_DATA: FetchComponentFoldersResponse =
  {
    example_folder: "Example Folder",
    example_folder_sample: "Sample Example Folder",
  };

export async function fetchComponentFolders(
  _options: {
    showSampleData?: boolean;
  } = {}
): Promise<FetchComponentFoldersResponse> {
  if (_options.showSampleData) {
    return MOCK_COMPONENT_FOLDERS_WITH_SAMPLE_DATA;
  }

  return MOCK_COMPONENT_FOLDERS;
}
