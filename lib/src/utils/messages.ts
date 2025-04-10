import boxen from "boxen";
import chalk from "chalk";
import output from "./output";

export function welcome() {
  const msg = chalk.white(`${chalk.bold(
    "Welcome to the",
    chalk.magentaBright("Ditto CLI")
  )}.

We're glad to have you here.`);
  output.write(boxen(msg, { padding: 1 }));
}
