const output = require("../output");

function projectsToText(projects) {
  return (
    (projects || []).reduce(
      (outputString, { name, id }) =>
        outputString +
        ("\n" +
          "- " +
          output.info(name) +
          " " +
          output.subtle("https://app.dittowords.com/doc/" + id)),
      ""
    ) + "\n"
  );
}

module.exports = projectsToText;
