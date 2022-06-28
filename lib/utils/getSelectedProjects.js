const fs = require("fs");
const yaml = require("js-yaml");

const { PROJECT_CONFIG_FILE } = require("../consts");

function yamlToJson(_yaml) {
  try {
    return yaml.safeLoad(_yaml);
  } catch (e) {
    if (e instanceof YAMLException) {
      return "";
    } else {
      throw e;
    }
  }
}

/**
 * Returns an array containing all valid projects ({ id, name })
 * currently contained in the project config file.
 */
function getSelectedProjects(configFile = PROJECT_CONFIG_FILE) {
  if (!fs.existsSync(configFile)) return [];

  const contentYaml = fs.readFileSync(configFile, "utf8");
  const contentJson = yamlToJson(contentYaml);

  if (!(contentJson && contentJson.projects)) {
    return [];
  }

  return contentJson.projects.filter(({ name, id }) => name && id);
}

const getIsUsingComponents = (configFile = PROJECT_CONFIG_FILE) => {
  if (!fs.existsSync(configFile)) return [];

  const contentYaml = fs.readFileSync(configFile, "utf8");
  const contentJson = yamlToJson(contentYaml);

  return contentJson && contentJson.components;
};

module.exports = { getSelectedProjects, getIsUsingComponents };
