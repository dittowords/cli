const fs = require('fs');

const ora = require('ora');
const { Select } = require('enquirer');

const api = require('./api').default;
const config = require('./config');
const consts = require('./consts');
const output = require('./output');

function shouldOverwrite(projectConfig, filename) {
  if (!fs.existsSync(filename)) return true;
  const overwrite = projectConfig.settings && projectConfig.settings.overwrite;
  if (overwrite === undefined) return 'ASK';
  return overwrite;
}

async function downloadAndSave(projectConfig) {
  const spinner = ora('Downloading');
  spinner.start();
  const projectId = projectConfig.projects[0].id;
  let msg;
  try {
    const res = await api.get(`/projects/${projectId}`);
    fs.writeFileSync(consts.TEXT_FILE, JSON.stringify(res.data));
    msg = `File saved to ${output.info(consts.TEXT_FILE)}`
  } catch (e) {
    let error = e.message;
    if (e.response && e.response.status == 401) {
      error = output.info('Unauthorized access to specified project');
    }
    msg = output.errorText(`We had problems... ${error}.`)
  }
  spinner.stop();

  return output.write(msg);
}

function exitGracefully() {
  console.info(
    output.warnText(`We will not overwrite the existing file at ${output.info(consts.TEXT_FILE)}.`),
  );
}

async function ask(projectConfig) {
  const filename = output.info(consts.TEXT_FILE);

  const prompt = new Select({
    name: 'choice',
    message: `Would you like to overwrite your existing ${filename}?`,
    choices: ['Yes', 'No', 'Always', 'Never'],
  });

  const response = await prompt.run();

  switch (response) {
    case 'Yes':
      downloadAndSave(projectConfig);
      break;
    case 'Always':
      config.save(consts.PROJECT_CONFIG_FILE, 'settings.overwrite', true);
      downloadAndSave(projectConfig);
      break;
    case 'Never':
      config.save(consts.PROJECT_CONFIG_FILE, 'settings.overwrite', false);
      exitGracefully();
      break;
    default: // No
      exitGracefully();
      break;
  }
}

function pull() {
  const pConfig = config.readData(consts.PROJECT_CONFIG_FILE);
  const overwrite = shouldOverwrite(pConfig, consts.TEXT_FILE);

  switch (overwrite) {
    case true:
      return downloadAndSave(pConfig);
    case false:
      return exitGracefully();
    default:
      return ask(pConfig);
  }
}

module.exports = pull;
