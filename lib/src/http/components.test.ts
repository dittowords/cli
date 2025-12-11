import getHttpClient from "./client";
import fetchComponents from "./components";

jest.mock("./client");

describe("fetchComponents", () => {
  // Create a mock client with a mock 'get' method
  const mockHttpClient = {
    get: jest.fn(),
  };

  // Make getHttpClient return the mock client
  (getHttpClient as jest.Mock).mockReturnValue(mockHttpClient);

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
            status: "FINAL",
            notes: "Test note",
            tags: ["tag1"],
            variableIds: ["var1"],
            folderId: null,
            variantId: "variant1",
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await fetchComponents(
        {
          filter: "",
          richText: "html",
        },
        {}
      );

      expect(result).toEqual([...mockResponse.data]);
    });

    it("should handle response without richText field", async () => {
      const mockResponse = {
        data: [
          {
            id: "text1",
            text: "Plain text only",
            status: "FINAL",
            notes: "",
            tags: [],
            variableIds: [],
            folderId: null,
            variantId: null,
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await fetchComponents(
        {
          filter: "",
          richText: "html",
        },
        {}
      );

      expect(result).toEqual([...mockResponse.data]);
    });
  });
});
