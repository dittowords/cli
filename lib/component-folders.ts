import { fetchComponentFolders } from "./http/fetchComponentFolders";

async function showComponentFolders() {
  const folders = await fetchComponentFolders();

  console.log(JSON.stringify(folders));
}

export { showComponentFolders };
