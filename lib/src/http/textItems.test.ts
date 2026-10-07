import getHttpClient from "./client";
import { exportTextItems } from "./textItems";
import { AxiosError } from "axios";

jest.mock("./client");

describe("exportTextItems", () => {
  const mockHttpClient = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getHttpClient as jest.Mock).mockReturnValue(mockHttpClient);
  });

  it("should throw error with response message", async () => {
    const mockAxiosError = new AxiosError("Invalid format");
    mockAxiosError.response = {
      status: 400,
      data: { message: "Invalid request parameters" },
    } as any;

    mockHttpClient.get.mockRejectedValue(mockAxiosError);

    await expect(
      exportTextItems(
        {
          filter: "",
          format: "invalid-format" as any,
        },
        {}
      )
    ).rejects.toThrow(
      "Invalid request parameters. Please check your request parameters and try again."
    );
  });

  it("should return response data", async () => {
    const mockData = `
      "component-1": "Hello, world!",
      "component-2": "Hello, world!",
    }`;
    mockHttpClient.get.mockResolvedValue({ status: 200, data: mockData });
    const result = await exportTextItems(
      {
        filter: "",
        format: "json_i18next" as any,
      },
      {}
    );
    expect(result).toEqual(mockData);
  });

  it("should parse arb-shaped responses with object metadata entries", async () => {
    const mockData = {
      "@@locale": "en",
      "text-item-1": "There are {count} items in the cart",
      "@text-item-1": {
        placeholders: {
          count: { type: "num" },
        },
      },
    };
    mockHttpClient.get.mockResolvedValue({ status: 200, data: mockData });

    const result = await exportTextItems(
      {
        filter: "",
        format: "arb" as any,
      },
      {}
    );

    expect(result).toEqual(mockData);
  });

  it("should parse json_i18next responses that include a __variables_used array", async () => {
    const mockData = {
      greeting: "Hello {{Name}}, you are {{Age}}",
      __variables_used: ["Age", "Name"],
    };
    mockHttpClient.get.mockResolvedValue({ status: 200, data: mockData });

    const result = await exportTextItems(
      {
        filter: "",
        format: "json_i18next",
        includeVariableSummary: "true",
      },
      {}
    );

    expect(result).toEqual(mockData);
  });
});
