// Only for formats that process escapes. A doubled backslash resolves last, so
// `\\n` stays a backslash and an `n`.
export function decodeEscapes(text: string): string {
  return text.replace(/\\(u[0-9a-fA-F]{4}|[nrt]|[^A-Za-z0-9])/g, (_, seq: string) => {
    switch (seq[0]) {
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      case "u":
        return String.fromCharCode(parseInt(seq.slice(1), 16));
      default:
        return seq; // \\ ' " ` ? @ % …
    }
  });
}

// 1-based (line, column) from a byte offset into a UTF-16 source string.
// Treats LF as the line break; CR-only sources will report a single line.
export function offsetToLineCol(source: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < offset; i++) {
    if (source.charCodeAt(i) === 10) {
      line++;
      lastNewline = i;
    }
  }
  return { line, column: offset - lastNewline };
}
