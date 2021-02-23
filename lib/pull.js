const fs = require('fs');

const ora = require('ora');
const { Select } = require('enquirer');

const api = require('./api').default;
const config = require('./config');
const consts = require('./consts');
const output = require('./output');

async function downloadAndSave(projectConfig) {
  const projectName = projectConfig.projects[0].name;
  const spinner = ora(`Fetching the latest text from ${projectName}...`);
  spinner.start();
  const projectId = projectConfig.projects[0].id;
  let msg;
  try {
    const res = await api.get(`/projects/${projectId}`);
    fs.writeFileSync(consts.TEXT_FILE, JSON.stringify(res.data));
    msg = `Fetching the latest text from ${output.info(projectName)}...${output.success('done')}. \nSuccessfully saved to ${output.info(consts.TEXT_FILE)}.`;
  } catch (e) {
    let error = e.message;
    if (e.response && e.response.status === 401) {
      error = output.info("Looks like you don't have access to the specified project.");
    }
    msg = output.errorText(`We hit an error fetching text from the project: ${error}`);
  }
  spinner.stop();

  return output.write(msg);
}

function pull() {
  const pConfig = config.readData(consts.PROJECT_CONFIG_FILE);
  return downloadAndSave(pConfig);
}

module.exports = pull;
