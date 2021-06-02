const output = require('../output');

function listProjects(projects) {
  return projects.reduce((outputString, { name, id }) => 
    outputString + (
      "\n" +
      "- " + output.info(name) +
      " " +
      output.subtle('https://beta.dittowords.com/doc/' + id)
    ), ""
  )
}

module.exports = listProjects;