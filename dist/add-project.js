var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { collectAndSaveProject } = require("./init/project");
const projectsToText = require("./utils/projectsToText");
const getSelectedProjects = require("./utils/getSelectedProjects");
function quit(exitCode = 2) {
    console.log("Project selection was not updated.");
    process.exitCode = exitCode;
    process.exit();
}
const addProject = () => __awaiter(this, void 0, void 0, function* () {
    const projects = getSelectedProjects();
    const usingComponents = getIsUsingComponents();
    try {
        if (usingComponents) {
            if (projects.length) {
                console.log(`\nYou're currently syncing text from the component library and from the following projects: ${projectsToText(projects)}`);
            }
            else {
                console.log(`\nYou're currently only syncing text from the component library`);
            }
        }
        else if (projects.length) {
            console.log(`\nYou're currently set up to sync text from the following projects: ${projectsToText(projects)}`);
        }
        yield collectAndSaveProject(false);
    }
    catch (error) {
        console.log(`\nSorry, there was an error adding a project to your workspace: `, error);
        quit();
    }
});
module.exports = addProject;
//# sourceMappingURL=add-project.js.map