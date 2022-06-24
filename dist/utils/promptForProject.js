var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { AutoComplete } = require("enquirer");
const output = require("../output");
function formatProjectChoice(project) {
    return (project.name +
        " " +
        output.subtle(project.url || `https://app.dittowords.com/doc/${project.id}`));
}
function parseResponse(response) {
    if (!response) {
        return null;
    }
    const [, name, id] = response.split(/^(.*)\s.*http.*\/(\w+).*$/);
    if (id === "all") {
        return { name, id: "ditto_component_library" };
    }
    return { name, id };
}
function promptForProject({ message, projects, limit = 10 }) {
    return __awaiter(this, void 0, void 0, function* () {
        output.nl();
        const choices = projects.map(formatProjectChoice);
        const prompt = new AutoComplete({
            name: "project",
            message,
            limit,
            choices,
        });
        let response;
        try {
            response = yield prompt.run();
        }
        catch (e) {
            // this catch handles the case where someone presses
            // Ctrl + C to kill the AutoComplete process
            response = null;
        }
        return parseResponse(response);
    });
}
module.exports = promptForProject;
//# sourceMappingURL=promptForProject.js.map