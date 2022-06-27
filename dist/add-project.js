"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const project_1 = require("./init/project");
const projectsToText_1 = __importDefault(require("./utils/projectsToText"));
const getSelectedProjects_1 = require("./utils/getSelectedProjects");
const output_1 = __importDefault(require("./output"));
function quit(exitCode = 2) {
    console.log("Project selection was not updated.");
    process.exitCode = exitCode;
    process.exit();
}
const addProject = async () => {
    const projects = (0, getSelectedProjects_1.getSelectedProjects)();
    const usingComponents = (0, getSelectedProjects_1.getIsUsingComponents)();
    try {
        if (usingComponents) {
            if (projects.length) {
                console.log(`\nYou're currently syncing text from the ${output_1.default.info("Component Library")} and from the following projects: ${(0, projectsToText_1.default)(projects)}`);
            }
            else {
                console.log(`\nYou're currently only syncing text from the ${output_1.default.info("Component Library")}`);
            }
        }
        else if (projects.length) {
            console.log(`\nYou're currently set up to sync text from the following projects: ${(0, projectsToText_1.default)(projects)}`);
        }
        await (0, project_1.collectAndSaveProject)(false);
    }
    catch (error) {
        console.log(`\nSorry, there was an error adding a project to your workspace: `, error);
        quit();
    }
};
exports.default = addProject;
//# sourceMappingURL=add-project.js.map