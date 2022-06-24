"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIsUsingComponents = exports.getSelectedProjects = void 0;
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const consts_1 = require("../consts");
function yamlToJson(_yaml) {
    try {
        return js_yaml_1.default.safeLoad(_yaml);
    }
    catch (e) {
        // if (e instanceof YAMLException) {
        //   return "";
        // } else {
        throw e;
        // }
    }
}
/**
 * Returns an array containing all valid projects ({ id, name })
 * currently contained in the project config file.
 */
const getSelectedProjects = (configFile = consts_1.PROJECT_CONFIG_FILE) => {
    if (!fs_1.default.existsSync(configFile))
        return [];
    const contentYaml = fs_1.default.readFileSync(configFile, "utf8");
    const contentJson = yamlToJson(contentYaml);
    if (!(contentJson && contentJson.projects)) {
        return [];
    }
    return contentJson.projects.filter(({ name, id }) => name && id);
};
exports.getSelectedProjects = getSelectedProjects;
/**
 * Returns an array containing all valid projects ({ id, name })
 * currently contained in the project config file.
 */
const getIsUsingComponents = (configFile = consts_1.PROJECT_CONFIG_FILE) => {
    if (!fs_1.default.existsSync(configFile))
        return [];
    const contentYaml = fs_1.default.readFileSync(configFile, "utf8");
    const contentJson = yamlToJson(contentYaml);
    return contentJson && contentJson.components;
};
exports.getIsUsingComponents = getIsUsingComponents;
//# sourceMappingURL=getSelectedProjects.js.map