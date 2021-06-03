const fs = require('fs');
const yaml = require('js-yaml');

const { PROJECT_CONFIG_FILE } = require('../consts');

function yamlToJson(_yaml) {
  try {
    return yaml.safeLoad(_yaml);
  }
  catch (e) {
    if (e instanceof YAMLException) {
      return "";
    }
    else {
      throw e;
    }
  }
}

function getSelectedProjects(configFile = PROJECT_CONFIG_FILE) {
  if (!fs.existsSync(configFile)) 
    return [];

  const contentYaml = fs.readFileSync(configFile, 'utf8');
  const contentJson = yamlToJson(contentYaml);

  if (!(
    contentJson &&
    contentJson.projects
  )) {
    return [];
  }

  return contentJson.projects;
}

module.exports = getSelectedProjects;