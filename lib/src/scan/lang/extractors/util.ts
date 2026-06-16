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
