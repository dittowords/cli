/**
 * Get the hostname from a URL string
 * @param hostString
 * @returns
 */
export default function getURLHostname(hostString: string) {
  if (!hostString.includes("://")) return hostString;
  // The WHATWG `URL` rather than `url.parse`, which prints a deprecation warning on
  // Node 22+ and would land mid-render during login.
  try {
    return new URL(hostString).hostname || "";
  } catch {
    return "";
  }
}
