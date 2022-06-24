var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const ora = require("ora");
const api = require("../api").default;
const config = require("../config");
const consts = require("../consts");
const output = require("../output");
const { collectAndSaveToken } = require("../init/token");
const { getSelectedProjects, getIsUsingComponents, } = require("../utils/getSelectedProjects");
const promptForProject = require("../utils/promptForProject");
function quit(exitCode = 2) {
    console.log("\nExiting Ditto CLI...\n");
    process.exitCode = exitCode;
    process.exit();
}
function saveProject(file, name, id) {
    // old functionality included "ditto_component_library" in the `projects`
    // array, but we want to always treat the component library as a separate
    // entity and use the new notation of a top-level `components` key
    if (id === "components") {
        config.writeData(file, { components: true });
        return;
    }
    const projects = [...getSelectedProjects(), { name, id }];
    config.writeData(file, { projects });
}
function needsSource() {
    return !config.parseSourceInformation().hasSourceData;
}
function askForAnotherToken() {
    return __awaiter(this, void 0, void 0, function* () {
        config.deleteToken(consts.CONFIG_FILE, consts.API_HOST);
        const message = "Looks like the API key you have saved no longer works. Please enter another one.";
        yield collectAndSaveToken(message);
    });
}
function listProjects(token, projectsAlreadySelected, componentsSelected) {
    return __awaiter(this, void 0, void 0, function* () {
        const spinner = ora("Fetching projects in your workspace...");
        spinner.start();
        let projects = [];
        try {
            projects = yield api.get("/project-names", {
                headers: {
                    Authorization: `token ${token}`,
                },
            });
        }
        catch (e) {
            spinner.stop();
            throw e;
        }
        spinner.stop();
        return projects.data.filter(({ id }) => {
            if (id === "ditto_component_library") {
                return !componentsSelected;
            }
            else {
                return !projectsAlreadySelected.some((project) => project.id === id);
            }
        });
    });
}
function collectProject(token, initialize) {
    return __awaiter(this, void 0, void 0, function* () {
        const path = process.cwd();
        if (initialize) {
            console.log(`Looks like there are no Ditto projects selected for your current directory: ${output.info(path)}.`);
        }
        const projectsAlreadySelected = getSelectedProjects();
        const usingComponents = getIsUsingComponents();
        const projects = yield listProjects(token, projectsAlreadySelected, usingComponents);
        if (!(projects && projects.length)) {
            console.log("You're currently syncing all projects in your workspace.");
            console.log(output.warnText("Not seeing a project that you were expecting? Verify that developer mode is enabled on that project. More info: https://www.dittowords.com/docs/ditto-developer-mode"));
            return null;
        }
        return promptForProject({
            projects,
            message: initialize
                ? "Choose the project you'd like to sync text from"
                : "Add a project",
        });
    });
}
function collectAndSaveProject(initialize = false) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = config.getToken(consts.CONFIG_FILE, consts.API_HOST);
            const project = yield collectProject(token, initialize);
            if (!project) {
                quit(0);
                return;
            }
            console.log("\n" +
                `Thanks for adding ${output.info(project.name)} to your selected projects.\n` +
                `We saved your updated configuration to: ${output.info(consts.PROJECT_CONFIG_FILE)}\n`);
            saveProject(consts.PROJECT_CONFIG_FILE, project.name, project.id);
        }
        catch (e) {
            console.log(e);
            if (e.response && e.response.status === 404) {
                yield askForAnotherToken();
                yield collectAndSaveProject();
            }
            else {
                quit();
            }
        }
    });
}
module.exports = { needsSource, collectAndSaveProject };
//# sourceMappingURL=project.js.map