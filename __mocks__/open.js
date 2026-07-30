// `open` ships as ESM only, which jest can't transform. Any suite that reaches
// it — directly or through a module that launches a browser — gets this stub.
const open = jest.fn(() => Promise.resolve());

module.exports = open;
module.exports.default = open;
