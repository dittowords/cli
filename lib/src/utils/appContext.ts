import { homedir } from "os";
import path from "path";
import crypto from "crypto";
import {
  DEFAULT_PROJECT_CONFIG_JSON,
  ProjectConfigYAML,
} from "../services/projectConfig";

/**
 * This class is used to store the global CLI context. It is preserved across all methods
 * and is used to store the running state of the CLI.
 */
class AppContext {
  #apiHost: string;
  #apiToken: string | undefined;
  #configFile: string;
  #projectConfigDir: string;
  #projectConfigFile: string;
  #clientId: string;
  #projectConfig: ProjectConfigYAML;

  constructor() {
    this.#apiHost = process.env.DITTO_API_HOST || "https://api.dittowords.com";
    this.#apiToken = process.env.DITTO_TOKEN;
    this.#configFile =
      process.env.DITTO_CONFIG_FILE || path.join(homedir(), ".config", "ditto");
    this.#projectConfigFile =
      process.env.DITTO_PROJECT_CONFIG_FILE ||
      path.normalize(path.join("ditto", "config.yml"));
    this.#projectConfigDir = path.normalize(
      path.dirname(this.#projectConfigFile)
    );
    this.#clientId = crypto.randomUUID();
    this.#projectConfig = DEFAULT_PROJECT_CONFIG_JSON;
  }

  get apiHost() {
    return this.#apiHost;
  }

  set apiHost(value: string) {
    this.#apiHost = value;
  }

  get apiToken() {
    return this.#apiToken;
  }

  get apiTokenOrThrow() {
    if (!this.#apiToken) {
      throw new Error("No API Token found.");
    }
    return this.#apiToken;
  }

  get configFile() {
    return this.#configFile;
  }

  get projectConfigFile() {
    return this.#projectConfigFile;
  }

  get clientId() {
    return this.#clientId;
  }

  setApiToken(value: string | undefined) {
    this.#apiToken = value;
  }

  get projectConfig() {
    return this.#projectConfig;
  }

  setProjectConfig(value: ProjectConfigYAML) {
    this.#projectConfig = value;
  }

  get selectedProjectConfigOutputs() {
    // TODO: Filter out based on flags.
    return this.#projectConfig.outputs;
  }

  get projectConfigDir() {
    return this.#projectConfigDir;
  }
}

const appContext = new AppContext();

export default appContext;
