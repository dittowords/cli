import { Output } from "../outputs";
import { ProjectConfigYAML } from "../services/projectConfig";
import { exportTextItems } from "../http/textItems";
import JSONICUFormatter from "./jsonICU";

jest.mock("../http/textItems");
jest.mock("../http/components");
jest.mock("../http/projects");
jest.mock("../http/variants");
jest.mock("../utils/appContext", () => ({
  __esModule: true,
  default: { outDir: "/mock/app/context/outDir" },
}));

const mockExportTextItems = exportTextItems as jest.MockedFunction<
  typeof exportTextItems
>;

describe("JSONICUFormatter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExportTextItems.mockResolvedValue({ greeting: "Hello" });
  });

  it("omits variant metadata and does not request a variable summary", async () => {
    const output: Output = { format: "json", framework: "icu", outDir: "/out" };
    const projectConfig: ProjectConfigYAML = {
      projects: [{ id: "project-1" }],
      outputs: [output],
    };
    const formatter = new JSONICUFormatter(output, projectConfig, {});

    // @ts-ignore - exercising the protected fetch directly
    await formatter.fetchAPIData();

    const [params] = mockExportTextItems.mock.calls[0];
    expect(params).toMatchObject({
      format: "json_icu",
      excludeVariantMetadata: "true",
    });
    // ICU never writes variables.json, and the API ignores the summary for this format
    expect(params).not.toHaveProperty("includeVariableSummary");
  });
});
