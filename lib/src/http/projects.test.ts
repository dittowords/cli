import { AxiosError } from "axios";
import getHttpClient from "./client";
import fetchProjects from "./projects";

jest.mock("./client");

describe("fetchProjects", () => {
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
          id: "project1",
          name: "Project One",
        },
        {
          id: "project2",
          name: "Project Two",
        },
      ],
    };

    mockHttpClient.get.mockResolvedValue(mockResponse);

    const result = await fetchProjects({});

    expect(result).toEqual([...mockResponse.data]);
  });

  it("should handle empty response", async () => {
    const mockResponse = {
      data: [],
    };

    mockHttpClient.get.mockResolvedValue(mockResponse);

    const result = await fetchProjects({});

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

    await expect(fetchProjects({})).rejects.toThrow(
      "Invalid filter format. Please check your project filters and try again."
    );
  });

  it("should handle error responses without message", async () => {
    const mockError = new AxiosError("Request failed");
    mockError.response = {
      status: 400,
      data: {},
    } as any;

    mockHttpClient.get.mockRejectedValue(mockError);

    await expect(fetchProjects({})).rejects.toThrow(
      "Invalid project filters. Please check your project filters and try again."
    );
  });
});
