import getHttpClient from "./client";
import fetchVariants from "./variants";

jest.mock("./client");

describe("fetchVariants", () => {
  const mockHttpClient = { get: jest.fn() };

  (getHttpClient as jest.Mock).mockReturnValue(mockHttpClient);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should parse response correctly", async () => {
    const mockResponse = {
      data: [
        {
          id: "variant1",
          name: "Variant One",
          description: "This is variant one",
        },
        {
          id: "variant2",
          name: "Variant Two",
          description: "This is variant two",
        },
      ],
    };

    mockHttpClient.get.mockResolvedValue(mockResponse);
    const result = await fetchVariants({});
    expect(result).toEqual([...mockResponse.data]);
  });

  it("should handle response without description field", async () => {
    const mockResponse = {
      data: [
        {
          id: "variant1",
          name: "Variant One",
        },
      ],
    };

    mockHttpClient.get.mockResolvedValue(mockResponse);
    const result = await fetchVariants({});
    expect(result).toEqual([...mockResponse.data]);
  });

  it("should handle empty response", async () => {
    const mockResponse = { data: [] };
    mockHttpClient.get.mockResolvedValue(mockResponse);
    const result = await fetchVariants({});
    expect(result).toEqual([]);
  });

  it("should have user-friendly error response if not instance of AxiosError", async () => {
    const mockError = new Error("Request failed");
    mockHttpClient.get.mockRejectedValue(mockError);

    await expect(fetchVariants({})).rejects.toThrow(
      "Sorry! We're having trouble reaching the Ditto API. Please try again later."
    );
  });
});
