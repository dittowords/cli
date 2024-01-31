import fs from "fs";
import path from "path";

jest.mock("./api", () => ({
  createApiClient: jest.fn(), // this needs to be mocked in each test that requires it
}));
import { createApiClient } from "./api";

const testProjects: Project[] = [
  {
    id: "1",
    name: "Project 1",
    fileName: "Project 1",
  },
  { id: "2", name: "Project 2", fileName: "Project 2" },
];

// TODO: all tests in this file currently failing because we're re-instantiating the api client
// everywhere and are unable to mock the return type separately for each instance of usage.
// We need to refactor to share one api client everywhere instead of always re-creating it.
const mockApi = createApiClient() as any as jest.Mocked<
  ReturnType<typeof createApiClient>
>;

jest.mock("./consts", () => ({
  TEXT_DIR: ".testing",
  API_HOST: "https://api.dittowords.com",
  CONFIG_FILE: ".testing/ditto",
  PROJECT_CONFIG_FILE: ".testing/config.yml",
  TEXT_FILE: ".testing/text.json",
}));

import consts from "./consts";
import allPull, { getFormatDataIsValid } from "./pull";
import { Project, SupportedExtension, SupportedFormat } from "./types";

const {
  _testing: { cleanOutputFiles, downloadAndSaveVariant, downloadAndSaveBase },
} = allPull;
const variant = "english";

const cleanOutputDir = () => {
  if (fs.existsSync(consts.TEXT_DIR))
    fs.rmSync(consts.TEXT_DIR, { recursive: true, force: true });

  fs.mkdirSync(consts.TEXT_DIR);
};

afterAll(() => {
  fs.rmSync(consts.TEXT_DIR, { force: true, recursive: true });
});

describe("cleanOutputFiles", () => {
  it("removes .js, .json, .xml, .strings, .stringsdict files", () => {
    cleanOutputDir();

    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.json"), "test");
    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.js"), "test");
    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.xml"), "test");
    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.strings"), "test");
    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.stringsdict"), "test");
    // this file shouldn't be deleted
    fs.writeFileSync(path.resolve(consts.TEXT_DIR, "test.txt"), "test");

    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(6);

    cleanOutputFiles();

    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(1);
  });
});

describe("downloadAndSaveBase", () => {
  beforeAll(() => {
    if (!fs.existsSync(consts.TEXT_DIR)) {
      fs.mkdirSync(consts.TEXT_DIR);
    }
  });

  beforeEach(() => {
    cleanOutputDir();
  });

  const mockDataFlat = { hello: "world" };
  const mockDataNested = { hello: { text: "world" } };
  const mockDataStructured = { hello: { text: "world" } };
  const mockDataIcu = { hello: "world" };
  const mockDataAndroid = `
      <?xml version="1.0" encoding="utf-8"?>
      <resources xmlns:xliff="urn:oasis:names:tc:xliff:document:1.2">
          <string name="hello-world" ditto_api_id="hello-world">Hello World</string>
      </resources>
    `;
  const mockDataIosStrings = `
      "hello" = "world"; 
    `;
  const mockDataIosStringsDict = `
      <?xml version="1.0" encoding="utf-8"?>
      <plist version="1.0">
          <dict>
              <key>hello-world</key>
              <dict>
                  <key>NSStringLocalizedFormatKey</key>
                  <string>%1$#@count@</string>
                  <key>count</key>
                  <dict>
                      <key>NSStringFormatSpecTypeKey</key>
                      <string>NSStringPluralRuleType</string>
                      <key>NSStringFormatValueTypeKey</key>
                      <string>d</string>
                      <key>other</key>
                      <string>espanol</string>
                  </dict>
              </dict>
          </dict>
      </plist>
    `;

  const formats: Array<{
    format: SupportedFormat;
    data: Object;
    ext: SupportedExtension;
  }> = [
    { format: "flat", data: mockDataFlat, ext: ".json" },
    { format: "nested", data: mockDataNested, ext: ".json" },
    { format: "structured", data: mockDataStructured, ext: ".json" },
    { format: "icu", data: mockDataIcu, ext: ".json" },
    { format: "android", data: mockDataAndroid, ext: ".xml" },
    { format: "ios-strings", data: mockDataIosStrings, ext: ".strings" },
    {
      format: "ios-stringsdict",
      data: mockDataIosStringsDict,
      ext: ".stringsdict",
    },
  ];

  const mockApiCall = (data: unknown) => {
    (createApiClient as any).mockImplementation(() => ({
      get: () => ({ data }),
    }));
  };

  const verifySavedData = async (
    format: SupportedFormat,
    data: unknown,
    ext: SupportedExtension
  ) => {
    const output = await downloadAndSaveBase({
      projects: testProjects,
      format: format,
    } as any);
    expect(/successfully saved/i.test(output)).toEqual(true);
    const directoryContents = fs.readdirSync(consts.TEXT_DIR);
    expect(directoryContents.length).toEqual(testProjects.length);
    expect(directoryContents.every((f) => f.endsWith(ext))).toBe(true);
    const fileDataString = fs.readFileSync(
      path.resolve(consts.TEXT_DIR, directoryContents[0]),
      "utf8"
    );

    switch (format) {
      case "android":
      case "ios-strings":
      case "ios-stringsdict":
        expect(typeof data).toBe("string");
        expect(fileDataString.replace(/\s/g, "")).toEqual(
          (data as string).replace(/\s/g, "")
        );
        break;

      case "flat":
      case "nested":
      case "structured":
      case "icu":
      default:
        expect(JSON.parse(fileDataString)).toEqual(data);
        break;
    }
  };

  formats.forEach(({ format, data, ext }) => {
    it(`writes the ${format} format to disk`, async () => {
      mockApiCall(data);
      await verifySavedData(format, data, ext);
    });
  });
});

describe("getFormatDataIsValid", () => {
  it("handles flat format appropriately", () => {
    expect(getFormatDataIsValid.flat("{}")).toBe(false);
    expect(getFormatDataIsValid.flat(`{ "hello": "world" }`)).toBe(true);
    expect(
      getFormatDataIsValid.flat(`{
      "__variant-name": "English",
      "__variant-description": ""
    }`)
    ).toBe(false);
    expect(
      getFormatDataIsValid.flat(`{
      "__variant-name": "English",
      "__variant-description": "",
      "hello": "world"
    }`)
    ).toBe(true);
  });
  it("handles structured format appropriately", () => {
    expect(getFormatDataIsValid.structured("{}")).toBe(false);
    expect(
      getFormatDataIsValid.structured(`{ "hello": { "text": "world" } }`)
    ).toBe(true);
    expect(
      getFormatDataIsValid.structured(`{
      "__variant-name": "English",
      "__variant-description": ""
    }`)
    ).toBe(false);
    expect(
      getFormatDataIsValid.structured(`{
      "__variant-name": "English",
      "__variant-description": "",
      "hello": { "text": "world" }
    }`)
    ).toBe(true);
  });
  it("handles icu format appropriately", () => {
    expect(getFormatDataIsValid.icu("{}")).toBe(false);
    expect(getFormatDataIsValid.icu(`{ "hello": "world" }`)).toBe(true);
    expect(
      getFormatDataIsValid.icu(`{
      "__variant-name": "English",
      "__variant-description": ""
    }`)
    ).toBe(false);
    expect(
      getFormatDataIsValid.icu(`{
      "__variant-name": "English",
      "__variant-description": "",
      "hello": "world"
    }`)
    ).toBe(true);
  });
  it("handles android format appropriately", () => {
    expect(
      getFormatDataIsValid.android(`
      <?xml version="1.0" encoding="utf-8"?>
      <resources xmlns:xliff="urn:oasis:names:tc:xliff:document:1.2"/>
    `)
    ).toBe(false);
    expect(
      getFormatDataIsValid.android(`
      <?xml version="1.0" encoding="utf-8"?>
      <!--Variant Name: English-->
      <!--Variant Description: -->
      <resources xmlns:xliff="urn:oasis:names:tc:xliff:document:1.2"/>
    `)
    ).toBe(false);
    expect(
      getFormatDataIsValid.android(`
      <?xml version="1.0" encoding="utf-8"?>
      <!--Variant Name: English-->
      <!--Variant Description: -->
      <resources xmlns:xliff="urn:oasis:names:tc:xliff:document:1.2">
          <string name="hello-world" ditto_api_id="hello-world">Hello World</string>
      </resources>
    `)
    ).toBe(true);
  });
  it("handles ios-strings format appropriately", () => {
    expect(getFormatDataIsValid["ios-strings"]("")).toBe(false);
    expect(
      getFormatDataIsValid["ios-strings"](`
        /* Variant Name: English */
        /* Variant Description: */
      `)
    ).toBe(false);
    expect(
      getFormatDataIsValid["ios-strings"](`
        /* Variant Name: English */
        /* Variant Description: */
        "Hello" = "World";
      `)
    ).toBe(true);
  });
  it("handles ios-stringsdict format appropriately", () => {
    expect(
      getFormatDataIsValid["ios-stringsdict"](`
        <?xml version="1.0" encoding="utf-8"?>
        <plist version="1.0">
            <dict/>
        </plist>
      `)
    ).toBe(false);
    expect(
      getFormatDataIsValid["ios-stringsdict"](`
        <?xml version="1.0" encoding="utf-8"?>
        <!--Variant Name: English-->
        <!--Variant Description: -->
        <plist version="1.0">
            <dict/>
        </plist>
      `)
    ).toBe(false);
    expect(
      getFormatDataIsValid["ios-stringsdict"](`
        <?xml version="1.0" encoding="utf-8"?>
        <!--Variant Name: English-->
        <!--Variant Description: -->
        <plist version="1.0">
            <dict>
              <key>Hello World</key>
              <dict>
                  <key>NSStringLocalizedFormatKey</key>
                  <string>%1$#@count@</string>
                  <key>count</key>
                  <dict>
                      <key>NSStringFormatSpecTypeKey</key>
                      <string>NSStringPluralRuleType</string>
                      <key>NSStringFormatValueTypeKey</key>
                      <string>d</string>
                      <key>other</key>
                      <string>espanol</string>
                  </dict>
              </dict>
            </dict>
        </plist>
      `)
    ).toBe(true);
  });
});
