import URL from "url";

/**
 * Get the hostname from a URL string
 * @param hostString
 * @returns
 */
export default function getURLHostname(hostString: string) {
  if (!hostString.includes("://")) return hostString;
  return URL.parse(hostString).hostname || "";
}
