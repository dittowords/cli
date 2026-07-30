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
    // Masked so the key isn't left echoed in the user's scrollback, or captured
    // by anything recording the terminal.
    type: "password",
    name: "token",
    message: "What is your API key?",
    validate: validate as any,
  });

  return response;
}
