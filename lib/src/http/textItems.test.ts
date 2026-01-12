import getHttpClient from "./client";
import { fetchTextItems, exportTextItems } from "./textItems";
import { AxiosError } from "axios";

jest.mock("./client");

describe("fetchTextItems", () => {
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
      data: { message: "Invalid project filters" },
    } as any;

    mockHttpClient.get.mockRejectedValue(mockAxiosError);

    await expect(
      fetchTextItems(
        {
          filter: "asdfasdf",
        },
        {}
      )
    ).rejects.toThrow(
      "Invalid project filters. Please check your project filters and try again."
    );
  });

  it("should parse response with richText field correctly", async () => {
    const mockResponse = {
      status: 200,
      data: [
        {
          id: "text1",
          text: "Plain text",
          richText: "<p>Rich <strong>HTML</strong> text</p>",
          status: "FINAL",
          notes: "Test note",
          pluralForm: null,
          tags: ["tag1"],
          variableIds: ["var1"],
          projectId: "project1",
          variantId: "variant1",
        },
      ],
    };

    mockHttpClient.get.mockResolvedValue(mockResponse);

    const result = await fetchTextItems(
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
          richText: undefined,
          status: "FINAL",
          notes: "",
          tags: [],
          pluralForm: null,
          variableIds: [],
          projectId: "project1",
          variantId: null,
        },
      ],
    };

    mockHttpClient.get.mockResolvedValue(mockResponse);

    const result = await fetchTextItems(
      {
        filter: "",
        richText: "html",
      },
      {}
    );

    expect(result).toEqual([...mockResponse.data]);
  });
});

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
});
