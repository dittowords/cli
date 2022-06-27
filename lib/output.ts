import chalk from "chalk";

export const errorText = (msg: string) => chalk.magenta(msg);
export const warnText = (msg: string) => chalk.yellow(msg);
export const info = (msg: string) => chalk.blueBright(msg);
export const success = (msg: string) => chalk.green(msg);
export const url = (msg: string) => chalk.blueBright.underline(msg);
export const subtle = (msg: string) => chalk.grey(msg);
export const write = (msg: string) => chalk.white(msg);
export const nl = () => console.log("\n");

export default {
  errorText,
  warnText,
  info,
  success,
  url,
  subtle,
  write,
  nl,
};
