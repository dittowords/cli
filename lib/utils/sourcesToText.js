const output = require("../output");

function sourcesToText(projects, componentLibrary) {
  let message = "";

  if (componentLibrary) {
    message += `the ${output.info("Component Library")}`;

    if (projects.length) {
      message += " and ";
    } else {
      message += ".";
    }
  }

  if (projects.length) {
    message += ` the following projects: ${projectsToText(projects)}\n`;
  }

  return message;
}

module.exports = sourcesToText;
