"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const processMetaOption = (inputArr) => {
    const res = {};
    if (!Array.isArray(inputArr)) {
        return res;
    }
    inputArr.forEach((element) => {
        const [key, value] = element.split(":");
        res[key] = value;
    });
    return res;
};
exports.default = processMetaOption;
//# sourceMappingURL=processMetaOption.js.map