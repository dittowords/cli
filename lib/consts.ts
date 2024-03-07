import { homedir } from "os";
import path from "path";

export default new (class {
  get API_HOST() {
    return process.env.DITTO_API_HOST || "https://api.dittowords.com";
  }
  get CONFIG_FILE() {
    return (
      process.env.DITTO_CONFIG_FILE || path.join(homedir(), ".config", "ditto")
    );
  }
  get PROJECT_CONFIG_FILE() {
    return path.normalize(path.join("ditto", "config.yml"));
  }
  get TEXT_DIR() {
    return process.env.DITTO_TEXT_DIR || "ditto";
  }
  get TEXT_FILE() {
    return path.normalize(path.join(this.TEXT_DIR, "text.json"));
  }
})();
