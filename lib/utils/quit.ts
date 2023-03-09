export function quit(message: string, exitCode = 2) {
  console.log(`\n${message}\n`);
  process.exitCode = exitCode;
  process.exit();
}
