import formatOutput from "./index";
import JSONFormatter from "./json";
import JSONICUFormatter from "./jsonICU";
import ARBFormatter from "./arb";
import AndroidXMLFormatter from "./android";
import IOSStringsFormatter from "./iosStrings";
import IOSStringsDictFormatter from "./iosStringsDict";
import logger from "../utils/logger";
import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import { CommandMetaFlags } from "../http/types";

jest.mock("./json");
jest.mock("./jsonICU");
jest.mock("./arb");
jest.mock("./android");
jest.mock("./iosStrings");
jest.mock("./iosStringsDict");

const mockFormat = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  [
    JSONFormatter,
    JSONICUFormatter,
    ARBFormatter,
    AndroidXMLFormatter,
    IOSStringsFormatter,
    IOSStringsDictFormatter,
  ].forEach((FormatterClass) => {
    (FormatterClass as unknown as jest.Mock).mockImplementation(() => ({
      format: mockFormat,
    }));
  });
});

describe("formatOutput", () => {
  const projectConfig: ProjectConfigYAML = {
    projects: [],
    variants: [],
    components: { folders: [] },
    outputs: [],
  };
  const meta: CommandMetaFlags = {};

  it("dispatches plain json to JSONFormatter", () => {
    formatOutput({ format: "json" } as Output, projectConfig, meta);
    expect(JSONFormatter).toHaveBeenCalled();
    expect(JSONICUFormatter).not.toHaveBeenCalled();
    expect(ARBFormatter).not.toHaveBeenCalled();
  });

  it("dispatches json + framework icu to JSONICUFormatter", () => {
    formatOutput(
      { format: "json", framework: "icu" } as Output,
      projectConfig,
      meta
    );
    expect(JSONICUFormatter).toHaveBeenCalled();
    expect(JSONFormatter).not.toHaveBeenCalled();
  });

  it("dispatches json + framework arb to ARBFormatter", () => {
    formatOutput(
      { format: "json", framework: "arb" } as Output,
      projectConfig,
      meta
    );
    expect(ARBFormatter).toHaveBeenCalled();
    expect(JSONFormatter).not.toHaveBeenCalled();
  });

  it("dispatches android to AndroidXMLFormatter", () => {
    formatOutput({ format: "android" } as Output, projectConfig, meta);
    expect(AndroidXMLFormatter).toHaveBeenCalled();
  });

  it("dispatches ios-strings to IOSStringsFormatter", () => {
    formatOutput({ format: "ios-strings" } as Output, projectConfig, meta);
    expect(IOSStringsFormatter).toHaveBeenCalled();
  });

  it("dispatches ios-stringsdict to IOSStringsDictFormatter", () => {
    formatOutput({ format: "ios-stringsdict" } as Output, projectConfig, meta);
    expect(IOSStringsDictFormatter).toHaveBeenCalled();
  });

  it("dispatches the deprecated json_icu format to JSONICUFormatter and logs a warning", () => {
    const writeLineSpy = jest.spyOn(logger, "writeLine").mockImplementation();

    formatOutput({ format: "json_icu" } as Output, projectConfig, meta);

    expect(JSONICUFormatter).toHaveBeenCalled();
    expect(writeLineSpy).toHaveBeenCalledTimes(1);
    expect(writeLineSpy.mock.calls[0][0]).toContain("json_icu");

    writeLineSpy.mockRestore();
  });

  it("throws for an unsupported format", () => {
    expect(() =>
      formatOutput({ format: "bogus" } as unknown as Output, projectConfig, meta)
    ).toThrow("Unsupported output format: bogus");
  });
});
