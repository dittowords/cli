import checkToken from "../../http/checkToken";
import collectAndSaveToken from "./collectAndSaveToken";

/**
 * Validate a token
 * @param token  The token to validate
 * @returns The newly validated token
 */
export default async function validateToken(token: string) {
  const response = await checkToken(token);
  if (!response.success) {
    return await collectAndSaveToken();
  }

  return token;
}
