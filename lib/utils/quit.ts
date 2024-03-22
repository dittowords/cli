export function quit(message: string | null, exitCode = 2) {
  if (message) console.log(`\n${message}\n`);
  process.exit(exitCode);
}
