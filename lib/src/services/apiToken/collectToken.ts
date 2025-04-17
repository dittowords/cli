import logger from "../../utils/logger";
import promptForApiToken from "./promptForApiToken";

/**
 * Outputs instructions to the user and collects an API token
 * @returns The collected token
 */
export default async function collectToken() {
  const apiUrl = logger.url("https://app.dittowords.com/account/devtools");
  const breadcrumbs = logger.bold(logger.info("API Keys"));
  const tokenDescription = `To get started, you'll need your Ditto API key. You can find this at: ${apiUrl} under "${breadcrumbs}".`;

  logger.writeLine(tokenDescription);

  const response = await promptForApiToken();
  return response.token;
}
