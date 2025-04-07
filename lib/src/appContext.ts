import { homedir } from "os";
import path from "path";
import crypto from "crypto";
const appContext = {
  API_HOST: process.env.DITTO_API_HOST || "https://api.dittowords.com",
  API_TOKEN: process.env.DITTO_TOKEN,
  CONFIG_FILE:
    process.env.DITTO_CONFIG_FILE || path.join(homedir(), ".config", "ditto"),
  PROJECT_CONFIG_FILE:
    process.env.DITTO_PROJECT_CONFIG_FILE ||
    path.normalize(path.join("ditto", "config.yml")),
  CLIENT_ID: crypto.randomUUID(),
};

export default appContext;
