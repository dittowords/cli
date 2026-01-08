import getHttpClient from "./client";
import fetchProjects from "./projects";

jest.mock("./client");

describe("fetchProjects", () => {
  const mockHttpClient = {
    get: jest.fn(),
  };

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
    const mockResponse = { data: [] };
    mockHttpClient.get.mockResolvedValue(mockResponse);
    const result = await fetchProjects({});
    expect(result).toEqual([]);
  });

  it("should have user-friendly error response if not instance of AxiosError", async () => {
    const mockError = new Error("Request failed");
    mockHttpClient.get.mockRejectedValue(mockError);

    await expect(fetchProjects({})).rejects.toThrow(
      "Sorry! We're having trouble reaching the Ditto API. Please try again later."
    );
  });
});
