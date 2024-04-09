import { fetchComponentFolders } from "./fetchComponentFolders";
import { fetchComponents } from "./fetchComponents";
import { fetchVariants } from "./fetchVariants";
import { importComponents } from "./importComponents";
import { jest } from "@jest/globals";
import axios from "axios";
import { vol } from "memfs";

jest.mock("../api");
jest.mock("fs");

const axiosMocked = jest.mocked(axios);

describe("fetchComponentFolders", () => {
  it("fetches component folders without error", async () => {
    axiosMocked.get.mockResolvedValueOnce({
      data: { "folder-id": "folder-name" },
    });
    const result = await fetchComponentFolders();
    expect(result["folder-id"]).toBe("folder-name");
  });
  it("supports showSampleData option", async () => {
    axiosMocked.get.mockResolvedValueOnce({
      data: { "folder-id": "folder-name" },
    });
    const result = await fetchComponentFolders({ showSampleData: true });
    expect(result["folder-id"]).toBe("folder-name");
  });
});

describe("fetchComponents", () => {
  it("fetches components without error", async () => {
    axiosMocked.get.mockResolvedValueOnce({
      data: {
        "component-id": {
          name: "component-name",
          text: "component-text",
          status: "NONE",
          folder: null,
        },
      },
    });
    const result = await fetchComponents();
    expect(result["component-id"]).toBeDefined();
    expect(result["component-id"].name).toBe("component-name");
    expect(result["component-id"].text).toBe("component-text");
  });
});

describe("fetchVariants", () => {
  it("fetches variants without error", async () => {
    axiosMocked.get.mockResolvedValueOnce({
      data: [
        {
          name: "variant-name",
          description: "variant-description",
          apiID: "variant-api-id",
        },
      ],
    });
    const result = await fetchVariants({
      shouldFetchComponentLibrary: true,
      validProjects: [],
      variants: true,
    });
    expect(result).toBeTruthy();
    expect(result![0]).toBeDefined();
    expect(result![0].name).toBe("variant-name");
    expect(result![0].description).toBe("variant-description");
    expect(result![0].apiID).toBe("variant-api-id");
  });
  it("returns null if `variants` isn't in config", async () => {
    const result = await fetchVariants({
      shouldFetchComponentLibrary: true,
      validProjects: [],
      variants: false,
    });
    expect(result).toBe(null);
  });
});

describe("importComponents", () => {
  beforeEach(() => {
    vol.reset();
  });
  it("imports components from existing file without error", async () => {
    vol.fromJSON({
      "/file.csv": "id,name,text\n1,one1,not empty\n2,two1,empty",
    });

    axiosMocked.mockResolvedValueOnce({
      data: {
        componentsInserted: 2,
        firstImportedId: "1",
      },
    });

    const result = await importComponents("/file.csv", {
      csvColumnMapping: {
        name: "name",
        text: 2,
        componentId: 0,
      },
    });

    expect(result.componentsInserted).toBe(2);
    expect(result.firstImportedId).toBe("1");
  });

  it("returns null firstImportedId if file doesn't exist", async () => {
    const result = await importComponents("/file.csv", {
      csvColumnMapping: {
        name: "name",
        text: 2,
        componentId: 0,
      },
    });

    expect(result.componentsInserted).toBe(0);
    expect(result.firstImportedId).toBe("null");
  });
});
