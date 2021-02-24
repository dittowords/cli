const fs = require('fs');

const chalk = require('chalk');

const { prompt } = require('enquirer');

const api = require('../api');
const consts = require('../consts');
const output = require('../output');
const config = require('../config');

function needsToken(configFile, host = consts.API_HOST) {
  const file = configFile || consts.CONFIG_FILE;
  if (!fs.existsSync(file)) return true;
  const configData = config.readData(file);
  if (!configData[config.justTheHost(host)]) return true;
  return false;
}

// Returns true if valid, otherwise an error message.
async function checkToken(token) {
  const axios = api.create(token);
  const endpoint = '/token-check';

  const resOrError = await axios.get(endpoint).catch((error) => {
    if (error.code === 'ENOTFOUND') {
      return output.errorText(`Can't connect to API: ${output.url(error.hostname)}`);
    }
    if (error.response.status === 401) {
      return output.errorText("This API key isn't valid. Please try another.");
    }
    return output.warnText("We're having trouble reaching the Ditto API: ", error);
  }).catch(() => output.errorText("Sorry! We're having trouble reaching the Ditto API."));

  if (typeof resOrError === 'string') return resOrError;

  if (resOrError.status === 200) return true;

  return output.errorText("This API key isn't valid. Please try another.");
}

async function collectToken() {
  const blue = output.info;
  const apiUrl = output.url('https://beta.dittowords.com/account/user');
  const breadcrumbs = `${blue('User')}`;
  const tokenDescription = `To get started, you'll need your Ditto API key. You can find this at: ${apiUrl} > ${breadcrumbs} under "${chalk.bold('API Keys')}".`;
  console.log(tokenDescription);

  const response = await prompt({
    type: 'input',
    name: 'token',
    message: 'What is your API key?',
    validate: (token) => (checkToken(token)),
  });
  return response.token;
}

async function collectAndSaveToken() {
  const token = await collectToken();
  console.log(`Thanks for authenticating.  We'll save the key to: ${output.info(consts.CONFIG_FILE)}`);
  output.nl();

  config.saveToken(consts.CONFIG_FILE, consts.API_HOST, token);
  return token;
}

module.exports = { needsToken, collectAndSaveToken };
