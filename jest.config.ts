import type { Config } from "jest";

const config: Config = {
  transformIgnorePatterns: [],
  moduleNameMapper: {
    "^unicorn-magic/node$":
      "<rootDir>/node_modules/unicorn-magic/node.js",
  },
  maxWorkers: 1,
  verbose: true,
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/bin/",
  ],
  watchPathIgnorePatterns: ["<rootDir>/.testing/", "<rootDir>/testing/"],
  collectCoverageFrom: ["lib/**/*.{js,jsx,ts,tsx}"],
  restoreMocks: true,
};

export default config;
