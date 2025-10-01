import * as Sentry from "@sentry/node";
import logger from "./logger";

export async function quit(message: string | null, exitCode = 2) {
  if (message) logger.writeLine(`\n${message}\n`);
  await Sentry.flush();
  process.exit(exitCode);
}
