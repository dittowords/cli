const chalk = require("chalk");

const errorText = (msg) => chalk.magenta(msg);
const warnText = (msg) => chalk.yellow(msg);
const info = (msg) => chalk.blueBright(msg);
const success = (msg) => chalk.green(msg);
const url = (msg) => chalk.blueBright.underline(msg);
const subtle = (msg) => chalk.grey(msg);
const write = (msg) => chalk.white(msg);
const nl = () => console.log("\n");

module.exports = {
  errorText,
  warnText,
  url,
  info,
  write,
  subtle,
  nl,
  success,
};
