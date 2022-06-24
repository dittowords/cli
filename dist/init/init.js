var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Related to initializing a user/environment to ditto.
// expected to be run once per project.
const boxen = require("boxen");
const chalk = require("chalk");
const projectsToText = require("../utils/projectsToText");
const { needsSource, collectAndSaveProject } = require("./project");
const { needsToken, collectAndSaveToken } = require("./token");
const config = require("../config");
const output = require("../output");
const sourcesToText = require("../utils/sourcesToText");
const needsInit = () => needsToken() || needsSource();
function welcome() {
    const msg = chalk.white(`${chalk.bold("Welcome to the", chalk.magentaBright("Ditto CLI"))}.

We're glad to have you here.`);
    console.log(boxen(msg, { padding: 1 }));
}
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        welcome();
        if (needsToken()) {
            yield collectAndSaveToken();
        }
        const { hasSourceData, validProjects, shouldFetchComponentLibrary } = config.parseSourceInformation();
        if (!hasSourceData) {
            yield collectAndSaveProject(true);
            return;
        }
        const message = "You're currently set up to sync text from " +
            sourcesToText(validProjects, shouldFetchComponentLibrary);
        console.log(message);
    });
}
module.exports = { needsInit, init };
//# sourceMappingURL=init.js.map