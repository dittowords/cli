import checkToken from "../../http/checkToken";
import logger from "../../utils/logger";
import collectAndSaveToken from "./collectAndSaveToken";

/**
 * Validate a token
 * @param token  The token to validate
 * @returns The newly validated token
 */
export default async function validateToken(token: string) {
  const response = await checkToken(token);
  if (!response.success) {
    logger.debug(
      `the API rejected that key: ${
        response.output?.join(" ") ?? "no reason given"
      }`
    );
    return await collectAndSaveToken();
  }

  return token;
}
