import fetchText from "./textItems";
import httpClient from "./client";

jest.mock("./client");

describe("fetchText", () => {
  const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("richText parameter", () => {
    it("should parse response with richText field correctly", async () => {
      const mockResponse = {
        data: [
          {
            id: "text1",
            text: "Plain text",
            richText: "<p>Rich <strong>HTML</strong> text</p>",
            status: "active",
            notes: "Test note",
            tags: ["tag1"],
            variableIds: ["var1"],
            projectId: "project1",
            variantId: "variant1",
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await fetchText({
        filter: "",
        richText: "html",
      });

      expect(result).toEqual([
        {
          id: "text1",
          text: "Plain text",
          richText: "<p>Rich <strong>HTML</strong> text</p>",
          status: "active",
          notes: "Test note",
          tags: ["tag1"],
          variableIds: ["var1"],
          projectId: "project1",
          variantId: "variant1",
        },
      ]);
    });

    it("should handle response without richText field", async () => {
      const mockResponse = {
        data: [
          {
            id: "text1",
            text: "Plain text only",
            status: "active",
            notes: "",
            tags: [],
            variableIds: [],
            projectId: "project1",
            variantId: null,
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await fetchText({
        filter: "",
        richText: "html",
      });

      expect(result).toEqual([
        {
          id: "text1",
          text: "Plain text only",
          richText: undefined,
          status: "active",
          notes: "",
          tags: [],
          variableIds: [],
          projectId: "project1",
          variantId: null,
        },
      ]);
    });
  });
});