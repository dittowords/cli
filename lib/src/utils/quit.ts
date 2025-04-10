import * as Sentry from "@sentry/node";
import output from "./output";

export async function quit(message: string | null, exitCode = 2) {
  if (message) output.write(`\n${message}\n`);
  await Sentry.flush();
  process.exit(exitCode);
}
