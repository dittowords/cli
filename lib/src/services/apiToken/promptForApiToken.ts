import checkToken from "../../http/checkToken";
import { prompt } from "enquirer";

export const validate = async (token: string) => {
  const result = await checkToken(token);
  if (!result.success) {
    return result.output?.join("\n") || "Invalid API key";
  }
  return true;
};

/**
 * Prompt the user for an API token
 * @returns The collected token
 */
export default async function promptForApiToken() {
  const response = await prompt<{ token: string }>({
    type: "input",
    name: "token",
    message: "What is your API key?",
    // @ts-expect-error - Enquirer types are not updated for the validate function
    validate,
  });

  return response;
}
