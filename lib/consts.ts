import { homedir } from "os";
import path from "path";

export const API_HOST =
  process.env.DITTO_API_HOST || "https://api.dittowords.com";
export const CONFIG_FILE =
  process.env.DITTO_CONFIG_FILE || path.join(homedir(), ".config", "ditto");
export const PROJECT_CONFIG_FILE = path.normalize(
  path.join("ditto", "config.yml")
);
export const TEXT_DIR = process.env.DITTO_TEXT_DIR || "ditto";
export const TEXT_FILE = path.normalize(path.join(TEXT_DIR, "text.json"));
