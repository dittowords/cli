import output from "../output";

interface Project {
  name: string;
  id: string;
}

const projectsToText = (projects: Project[]) => {
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
};

export default projectsToText;
