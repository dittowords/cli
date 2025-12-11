import { AxiosError } from "axios";
import getHttpClient from "./client";
import fetchVariants from "./variants";

jest.mock("./client");

describe("fetchVariants", () => {
  // Create a mock client with a mock 'get' method
  const mockHttpClient = {
    get: jest.fn(),
  };

  // Make getHttpClient return the mock client
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
    const mockResponse = {
      data: [],
    };

    mockHttpClient.get.mockResolvedValue(mockResponse);

    const result = await fetchVariants({});

    expect(result).toEqual([]);
  });

  it("should handle error responses", async () => {
    const mockError = new AxiosError("Request failed");
    mockError.response = {
      status: 400,
      data: {
        message: "Invalid filter format",
      },
    } as any;

    mockHttpClient.get.mockRejectedValue(mockError);

    await expect(fetchVariants({})).rejects.toThrow(
      "Invalid filter format. Please check your variant filters and try again."
    );
  });

  it("should handle error responses without message", async () => {
    const mockError = new AxiosError("Request failed");
    mockError.response = {
      status: 400,
      data: {},
    } as any;

    mockHttpClient.get.mockRejectedValue(mockError);

    await expect(fetchVariants({})).rejects.toThrow(
      "Invalid variant filters. Please check your variant filters and try again."
    );
  });
});

