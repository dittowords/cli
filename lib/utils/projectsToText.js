const output = require('../output');

function projectsToText(projects) {
  return projects.reduce((outputString, { name, id }) => 
    outputString + (
      "\n" +
      "- " + output.info(name) +
      " " +
      output.subtle('https://beta.dittowords.com/doc/' + id)
    ), ""
  ) + "\n"
}

module.exports = projectsToText;