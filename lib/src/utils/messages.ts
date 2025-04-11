import boxen from "boxen";
import chalk from "chalk";
import logger from "./logger";

export function welcome() {
  const msg = chalk.white(`${chalk.bold(
    "Welcome to the",
    chalk.magentaBright("Ditto CLI")
  )}.

We're glad to have you here.`);
  logger.writeLine(boxen(msg, { padding: 1 }));
}
