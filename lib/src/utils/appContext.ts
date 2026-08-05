import { homedir } from "os";
import path from "path";
import crypto from "crypto";
import {
  DEFAULT_PROJECT_CONFIG_JSON,
  ProjectConfigYAML,
} from "../services/projectConfig";

const DEFAULT_API_HOST = "https://api.dittowords.com";
const DEFAULT_APP_HOST = "https://app.dittowords.com";

/**
 * This class is used to store the global CLI context. It is preserved across all methods
 * and is used to store the running state of the CLI.
 */
class AppContext {
  #apiHost: string;
  #appHost: string;
  #authToken: string | undefined;
  #configFile: string;
  #projectConfigDir: string;
  #projectConfigFile: string;
  #clientId: string;
  #projectConfig: ProjectConfigYAML;
  #outDir: string;
  constructor() {
    this.#apiHost = process.env.DITTO_API_HOST || DEFAULT_API_HOST;
    this.#appHost = process.env.DITTO_APP_HOST || DEFAULT_APP_HOST;
    this.#authToken = process.env.DITTO_TOKEN;
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
    this.#outDir = process.env.DITTO_OUT_DIR || this.projectConfigDir;
  }

  get apiHost() {
    return this.#apiHost;
  }

  get appHost() {
    return this.#appHost;
  }

  set apiHost(value: string) {
    this.#apiHost = value;
  }

  /** The `Authorization` header value: an API key verbatim, or `Bearer <token>`. */
  get authToken() {
    return this.#authToken;
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

  setClientId(value: string) {
    this.#clientId = value;
  }

  setAuthToken(value: string | undefined) {
    this.#authToken = value;
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

  get outDir() {
    return this.projectConfig.outDir || this.#outDir;
  }
}

const appContext = new AppContext();

export default appContext;
