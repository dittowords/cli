import { z } from "zod";

/**
 * An Error extension designed to be thrown from anywhere in the CLI.
 * The custom properties provide a reliable way to include additional data
 * (what the error was and context around it) that can be leveraged
 * to pass along data to the user, to Sentry, or to other services.
 */
export default class DittoError<T extends ErrorType> extends Error {
  exitCode: number | undefined;
  type: ErrorType;
  // Note: if you see the type error "Type 'T' cannot be used to index type 'ErrorDataMap'",
  // a value is missing from the ErrorDataMap defined below
  data: ErrorDataMap[T];

  /**
   * Creates a new custom error with the following properties:
   * @param type The type of error, from the ErrorType enum
   * @param message Optional: error message to display to the user
   * @param exitCode Optional: exit code to return to the shell.
   * @param data Optional: additional data to pass along with the error
   */
  constructor({
    type,
    message,
    exitCode,
    data,
  }: {
    type: T;
    message?: string;
    exitCode?: number;
    data: ErrorDataMap[T];
  }) {
    const errorMessage =
      message ||
      "Something went wrong. Please contact support or try again later.";

    super(errorMessage);

    this.exitCode = exitCode;
    this.type = type;
    this.data = data;
  }
}

/**
 * Exhaustive list of DittoError types
 * When adding to this list, you must also add a Data type to ErrorDataMap
 */
export enum ErrorType {
  ConfigYamlLoadError = "ConfigYamlLoadError",
  ConfigParseError = "ConfigParseError",
}

/**
 * Map of DittoError types to the data that is required for that type
 * The keys of this must exhaustively match the keys of the ErrorType enum
 */
type ErrorDataMap = {
  [ErrorType.ConfigYamlLoadError]: ConfigYamlLoadErrorData;
  [ErrorType.ConfigParseError]: ConfigParseErrorData;
};

type ConfigYamlLoadErrorData = {
  rawErrorMessage: string;
};

type ConfigParseErrorData = {
  issues: z.ZodIssue[];
  messagePrefix: string;
};

export function isDittoError(error: unknown): error is DittoError<ErrorType> {
  return error instanceof DittoError;
}
export function isDittoErrorType<T extends ErrorType>(
  error: DittoError<ErrorType>,
  type: T
): error is DittoError<T> {
  return error.type === type;
}
