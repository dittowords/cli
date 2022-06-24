#!/usr/bin/env node
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
// This is the main entry point for the ditto-cli command.
const commander_1 = require("commander");
// to use V8's code cache to speed up instantiation time
require("v8-compile-cache");
const init_1 = require("./init/init");
const pull_1 = require("./pull");
const add_project_1 = __importDefault(require("./add-project"));
const remove_project_1 = __importDefault(require("./remove-project"));
const processMetaOption_1 = __importDefault(require("./utils/processMetaOption"));
/**
 * Catch and report unexpected error.
 * @param {any} error The thrown error object.
 * @returns {void}
 */
function quit(exitCode = 2) {
    console.log("\nExiting Ditto CLI...\n");
    process.exitCode = exitCode;
    process.exit();
}
const setupCommands = () => {
    commander_1.program.name("ditto-cli");
    commander_1.program
        .command("pull")
        .description("Sync copy from Ditto into working directory")
        .action(() => checkInit("pull"));
    const projectDescription = "Add a Ditto project to sync copy from";
    const projectCommand = commander_1.program
        .command("project")
        .description(projectDescription)
        .action(() => checkInit("project"));
    projectCommand
        .command("add")
        .description(projectDescription)
        .action(() => checkInit("project"));
    projectCommand
        .command("remove")
        .description("Stop syncing copy from a Ditto project")
        .action(() => checkInit("project remove"));
};
const setupOptions = () => {
    commander_1.program.option("-m, --meta <data...>", "Optional metadata for this command to send arbitrary data to the backend. Ex: -m githubActionRequest:true trigger:manual");
};
const checkInit = (command) => __awaiter(void 0, void 0, void 0, function* () {
    if ((0, init_1.needsInit)() && command !== "project remove") {
        try {
            yield (0, init_1.init)();
            if (command === "pull")
                main(); // re-run to actually pull text now that init is finished
        }
        catch (error) {
            quit();
        }
    }
    else {
        const { meta } = commander_1.program.opts();
        switch (command) {
            case "pull":
                (0, pull_1.pull)({ meta: (0, processMetaOption_1.default)(meta) });
                break;
            case "project":
            case "project add":
                (0, add_project_1.default)();
                break;
            case "project remove":
                (0, remove_project_1.default)();
                break;
            case "none":
                setupCommands();
                commander_1.program.help();
                break;
            default:
                quit();
        }
    }
});
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    if (process.argv.length <= 2 && process.argv[1].includes("ditto-cli")) {
        yield checkInit("none");
    }
    else {
        setupCommands();
        setupOptions();
    }
    commander_1.program.parse(process.argv);
});
main();
//# sourceMappingURL=ditto.js.map