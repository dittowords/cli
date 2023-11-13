import { fetchComponentFolders } from "./http/fetchComponentFolders";

async function showComponentFolders(options: { showSampleData?: boolean }) {
  const folders = await fetchComponentFolders(options);

  console.log(JSON.stringify(folders));
}

export { showComponentFolders };
