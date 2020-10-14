const fs = require('fs');

const chalk = require('chalk');
const yaml = require('js-yaml');

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
      return output.errorText('This token does not seem valid.');
    }
    return output.warnText('Got an unexpected response from the API.');
  }).catch(() => output.errorText('Unknown Error trying to communicate with API'));

  if (typeof resOrError === 'string') return resOrError;

  if (resOrError.status === 200) return true;

  return output.errorText('This token does not seem valid.');
}

async function collectToken(demo = false) {
  const blue = output.info;
  const apiUrl = output.url('https://beta.dittowords.com/account/user');
  const breadcrumbs = `${blue('Dittowords.com')} > ${blue('Account')} > ${blue('User')}`;
  const tokenDescription = `We'll need you to supply your API Token for Ditto.

You can find this at: ${apiUrl}.

${breadcrumbs} under "${chalk.bold('API Tokens')}".
`;
  output.write(tokenDescription);

  const response = await prompt({
    type: 'input',
    name: 'token',
    message: 'What is your API Token?',
    validate: (token) => (demo || checkToken(token)),
  });
  return response.token;
}

async function collectAndSaveToken(demo = false) {
  const token = await collectToken(demo);

  output.write("Thanks, the token works.  We'll save it to:");
  console.log('\n');
  console.log(output.info(consts.CONFIG_FILE));

  if (!demo) config.saveToken(consts.CONFIG_FILE, consts.API_HOST, token);
}

module.exports = { needsToken, collectAndSaveToken };
