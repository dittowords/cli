import * as Sentry from "@sentry/node";

export async function quit(message: string | null, exitCode = 2) {
  if (message) console.log(`\n${message}\n`);
  await Sentry.flush();
  process.exit(exitCode);
}
