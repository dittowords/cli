import { prompt } from "enquirer";

export type LoginMethod = "browser" | "apiKey";

/**
 * Asks how someone wants to authenticate. Only reached when no credential was
 * found and there's a terminal to ask in — `ditto login --browser` and
 * `ditto login --api-key` answer it up front.
 */
export default async function promptForLoginMethod() {
  const response = await prompt<{ method: LoginMethod }>({
    type: "select",
    name: "method",
    message: "How do you want to log in?",
    choices: [
      { name: "browser", message: "Log in through your browser" },
      { name: "apiKey", message: "Paste API key" },
    ],
  });

  return response.method;
}
