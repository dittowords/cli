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
const config_1 = __importDefault(require("./config"));
const consts_1 = __importDefault(require("./consts"));
const output_1 = __importDefault(require("./output"));
const getSelectedProjects_1 = require("./utils/getSelectedProjects");
const promptForProject_1 = __importDefault(require("./utils/promptForProject"));
function removeProject() {
    return __awaiter(this, void 0, void 0, function* () {
        const projects = (0, getSelectedProjects_1.getSelectedProjects)();
        const isUsingComponents = (0, getSelectedProjects_1.getIsUsingComponents)();
        if (!projects.length && !isUsingComponents) {
            console.log("\n" +
                "No projects found in your workspace.\n" +
                `Try adding one with: ${output_1.default.info("ditto-cli project add")}\n`);
            return;
        }
        const allProjects = isUsingComponents
            ? [{ id: "components", name: "Ditto Component Library" }, ...projects]
            : projects;
        const projectToRemove = yield (0, promptForProject_1.default)({
            projects: allProjects,
            message: isUsingComponents
                ? "Select a project or library to remove"
                : "Select a project to remove",
        });
        if (!projectToRemove)
            return;
        config_1.default.writeData(consts_1.default.PROJECT_CONFIG_FILE, {
            components: isUsingComponents && projectToRemove.id !== "components",
            projects: projects.filter(({ id }) => id !== projectToRemove.id),
        });
        console.log(`\n${output_1.default.info(projectToRemove.name)} has been removed from your selected projects. ` +
            `\nWe saved your updated configuration to: ${output_1.default.info(consts_1.default.PROJECT_CONFIG_FILE)}` +
            "\n");
    });
}
exports.default = removeProject;
//# sourceMappingURL=remove-project.js.map