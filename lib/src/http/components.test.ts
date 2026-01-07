import getHttpClient from "./client";
import { fetchComponents, exportComponents } from "./components";
import { AxiosError } from "axios";

jest.mock("./client");

describe("fetchComponents", () => {
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
      data: { message: "Invalid filters" },
    } as any;

    mockHttpClient.get.mockRejectedValue(mockAxiosError);

    await expect(
      fetchComponents(
        {
          filter: "asdfasdf",
        },
        {}
      )
    ).rejects.toThrow(
      "Invalid filters. Please check your component filters and try again."
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

describe("exportComponents", () => {
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
      data: { message: "Invalid format parameter" },
    } as any;

    mockHttpClient.get.mockRejectedValue(mockAxiosError);

    await expect(
      exportComponents(
        {
          filter: "",
          format: "invalid-format" as any,
        },
        {}
      )
    ).rejects.toThrow(
      "Invalid format parameter. Please check your params and try again."
    );
  });

  it("should return response data", async () => {
    const mockData = `
      "component-1": "Hello, world!",
      "component-2": "Hello, world!",
    }`;
    mockHttpClient.get.mockResolvedValue({ status: 200, data: mockData });
    const result = await exportComponents(
      {
        filter: "",
        format: "json_i18next" as any,
      },
      {}
    );
    expect(result).toEqual(mockData);
  });
});
