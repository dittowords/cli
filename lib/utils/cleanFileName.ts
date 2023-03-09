export function cleanFileName(fileName: string): string {
  return fileName
    .replace(/\s{1,}/g, "-")
    .replace(/[^a-zA-Z0-9-_.]/g, "")
    .toLowerCase();
}
