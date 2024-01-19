export function cleanFileName(fileName: string): string {
  let parts = fileName.split(/\s{1,}/g);
  parts = parts.map((part) =>
    part.replace(/[^a-zA-Z0-9-_.]/g, "").toLowerCase()
  );
  parts = parts.filter((part) => part !== "");
  return parts.join("-");
}
