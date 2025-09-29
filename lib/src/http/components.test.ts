import httpClient from "./client";
import fetchComponents from "./components";

jest.mock("./client");

describe("fetchComponents", () => {
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
            folderId: null,
            variantId: "variant1",
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await fetchComponents({
        filter: "",
        richText: "html",
      });

      expect(result).toEqual([...mockResponse.data]);
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
            folderId: null,
            variantId: null,
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await fetchComponents({
        filter: "",
        richText: "html",
      });

      expect(result).toEqual([...mockResponse.data]);
    });
  });
});
