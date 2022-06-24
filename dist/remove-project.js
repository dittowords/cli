var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const config = require("./config");
const consts = require("./consts");
const output = require("./output");
const getSelectedProjects = require("./utils/getSelectedProjects");
const promptForProject = require("./utils/promptForProject");
function removeProject() {
    return __awaiter(this, void 0, void 0, function* () {
        const projects = getSelectedProjects();
        if (!projects.length) {
            console.log("\n" +
                "No projects found in your workspace.\n" +
                `Try adding one with: ${output.info("ditto-cli project add")}\n`);
            return;
        }
        const projectToRemove = yield promptForProject({
            projects,
            message: "Select a project to remove",
        });
        if (!projectToRemove)
            return;
        config.writeData(consts.PROJECT_CONFIG_FILE, {
            projects: projects.filter(({ id }) => id !== projectToRemove.id),
        });
        console.log(`\n${output.info(projectToRemove.name)} has been removed from your selected projects. ` +
            `\nWe saved your updated configuration to: ${output.info(consts.PROJECT_CONFIG_FILE)}` +
            "\n");
    });
}
module.exports = removeProject;
//# sourceMappingURL=remove-project.js.map