import { homedir } from "os";
import path from "path";
import crypto from "crypto";

class AppContext {
  #apiHost: string;
  #apiToken: string | undefined;
  #configFile: string;
  #projectConfigFile: string;
  #clientId: string;

  constructor() {
    this.#apiHost = process.env.DITTO_API_HOST || "https://api.dittowords.com";
    this.#apiToken = process.env.DITTO_TOKEN;
    this.#configFile =
      process.env.DITTO_CONFIG_FILE || path.join(homedir(), ".config", "ditto");
    this.#projectConfigFile =
      process.env.DITTO_PROJECT_CONFIG_FILE ||
      path.normalize(path.join("ditto", "config.yml"));
    this.#clientId = crypto.randomUUID();
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
}

const appContext = new AppContext();

export default appContext;
