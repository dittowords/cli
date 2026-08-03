import appContext from "../../utils/appContext";
import logger from "../../utils/logger";
import promptForApiToken from "./promptForApiToken";

/**
 * Outputs instructions to the user and collects an API token
 * @returns The collected token
 */
export default async function collectToken() {
  const apiUrl = logger.url(`${appContext.appHost}/developers/api-keys`);
  const tokenDescription = `To get started, you'll need your Ditto API key. You can find this at: ${apiUrl}.`;

  logger.writeLine(tokenDescription);

  const response = await promptForApiToken();
  return response.token;
}
