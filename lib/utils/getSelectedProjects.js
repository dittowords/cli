const fs = require('fs');
const yaml = require('js-yaml');

const { PROJECT_CONFIG_FILE } = require('../consts');

function getSelectedProjects() {
  const contentYaml = fs.readFileSync(PROJECT_CONFIG_FILE, 'utf8');
  const contentJson = yaml.safeLoad(contentYaml);

  if (!(
    contentJson &&
    contentJson.projects
  )) {
    return [];
  }

  return contentJson.projects;
}

module.exports = getSelectedProjects;