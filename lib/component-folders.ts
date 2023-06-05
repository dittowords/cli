import { fetchComponentFolders } from "./http/fetchComponentFolders";

async function showComponentFolders() {
  const folders = await fetchComponentFolders();

  console.log(folders);
}

export { showComponentFolders };
