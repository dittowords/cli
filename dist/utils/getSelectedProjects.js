"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIsUsingComponents = exports.getSelectedProjects = void 0;
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importStar(require("js-yaml"));
const consts_1 = require("../consts");
function jsonIsConfigYAML(json) {
    return typeof json === "object";
}
function yamlToJson(_yaml) {
    try {
        let configYaml = js_yaml_1.default.load(_yaml);
        if (!jsonIsConfigYAML(configYaml)) {
            throw "Yaml is misconfigured";
        }
        return configYaml;
    }
    catch (e) {
        if (e instanceof js_yaml_1.YAMLException) {
            return null;
        }
        else {
            throw e;
        }
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