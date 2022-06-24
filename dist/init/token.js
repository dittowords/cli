var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fs = require("fs");
const chalk = require("chalk");
const { prompt } = require("enquirer");
const api = require("../api");
const consts = require("../consts");
const output = require("../output");
const config = require("../config");
function needsToken(configFile, host = consts.API_HOST) {
    if (config.getTokenFromEnv()) {
        return false;
    }
    const file = configFile || consts.CONFIG_FILE;
    if (!fs.existsSync(file))
        return true;
    const configData = config.readData(file);
    if (!configData[config.justTheHost(host)] ||
        configData[config.justTheHost(host)][0].token === "")
        return true;
    return false;
}
// Returns true if valid, otherwise an error message.
function checkToken(token) {
    return __awaiter(this, void 0, void 0, function* () {
        const axios = api.create(token);
        const endpoint = "/token-check";
        const resOrError = yield axios
            .get(endpoint)
            .catch((error) => {
            if (error.code === "ENOTFOUND") {
                return output.errorText(`Can't connect to API: ${output.url(error.hostname)}`);
            }
            if (error.response.status === 401 || error.response.status === 404) {
                return output.errorText("This API key isn't valid. Please try another.");
            }
            return output.warnText("We're having trouble reaching the Ditto API.");
        })
            .catch(() => output.errorText("Sorry! We're having trouble reaching the Ditto API."));
        if (typeof resOrError === "string")
            return resOrError;
        if (resOrError.status === 200)
            return true;
        return output.errorText("This API key isn't valid. Please try another.");
    });
}
function collectToken(message) {
    return __awaiter(this, void 0, void 0, function* () {
        const blue = output.info;
        const apiUrl = output.url("https://app.dittowords.com/account/user");
        const breadcrumbs = `${blue("User")}`;
        const tokenDescription = message ||
            `To get started, you'll need your Ditto API key. You can find this at: ${apiUrl} > ${breadcrumbs} under "${chalk.bold("API Keys")}".`;
        console.log(tokenDescription);
        const response = yield prompt({
            type: "input",
            name: "token",
            message: "What is your API key?",
            validate: (token) => checkToken(token),
        });
        return response.token;
    });
}
function quit(exitCode = 2) {
    console.log("API key was not saved.");
    process.exitCode = exitCode;
    process.exit();
}
function collectAndSaveToken(message = null) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = yield collectToken(message);
            console.log(`Thanks for authenticating.  We'll save the key to: ${output.info(consts.CONFIG_FILE)}`);
            output.nl();
            config.saveToken(consts.CONFIG_FILE, consts.API_HOST, token);
            return token;
        }
        catch (error) {
            quit();
        }
    });
}
module.exports = { needsToken, collectAndSaveToken };
//# sourceMappingURL=token.js.map