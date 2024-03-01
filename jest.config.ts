import type { Config } from "jest";

const config: Config = {
  transformIgnorePatterns: [],
  maxWorkers: 1,
  verbose: true,
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/bin/",
  ],
  watchPathIgnorePatterns: ["<rootDir>/.testing/", "<rootDir>/testing/"],
  collectCoverageFrom: ["lib/**/*.{js,jsx,ts,tsx}"],
};

export default config;
