"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const addProject = () => __awaiter(void 0, void 0, void 0, function* () {
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
        yield (0, project_1.collectAndSaveProject)(false);
    }
    catch (error) {
        console.log(`\nSorry, there was an error adding a project to your workspace: `, error);
        quit();
    }
});
exports.default = addProject;
//# sourceMappingURL=add-project.js.map