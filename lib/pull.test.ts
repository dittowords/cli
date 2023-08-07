import fs from "fs";
import path from "path";
import { createApiClient } from "./api";

const testProjects = [
  {
    id: "1",
    name: "Project 1",
    fileName: "Project 1",
  },
  { id: "2", name: "Project 2", fileName: "Project 2" },
];

jest.mock("./api");

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

// describe("downloadAndSaveVariant", () => {
//   beforeAll(() => {
//     if (!fs.existsSync(consts.TEXT_DIR)) {
//       fs.mkdirSync(consts.TEXT_DIR);
//     }
//   });

//   it("writes a single file for default format", async () => {
//     cleanOutputDir();

//     const output = await downloadAndSaveVariant(variant, testProjects, "");
//     expect(/saved to.*english\.json/.test(output)).toEqual(true);
//     expect(output.match(/saved to/g)?.length).toEqual(1);
//     expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(1);
//   });

//   it("writes multiple files for flat format", async () => {
//     cleanOutputDir();

//     const output = await downloadAndSaveVariant(variant, testProjects, "flat");

//     expect(/saved to.*Project 1__english\.json/.test(output)).toEqual(true);
//     expect(/saved to.*Project 2__english\.json/.test(output)).toEqual(true);
//     expect(output.match(/saved to/g)?.length).toEqual(2);
//     expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
//   });

//   it("writes multiple files for structured format", async () => {
//     cleanOutputDir();

//     const output = await downloadAndSaveVariant(
//       variant,
//       testProjects,
//       "structured"
//     );

//     expect(/saved to.*Project 1__english\.json/.test(output)).toEqual(true);
//     expect(/saved to.*Project 2__english\.json/.test(output)).toEqual(true);
//     expect(output.match(/saved to/g)?.length).toEqual(2);
//     expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
//   });
// });

describe("downloadAndSaveBase", () => {
  beforeAll(() => {
    if (!fs.existsSync(consts.TEXT_DIR)) {
      fs.mkdirSync(consts.TEXT_DIR);
    }
  });

  it("writes to text.json for default format", async () => {
    cleanOutputDir();

    mockApi.get.mockResolvedValueOnce({ data: [] });
    const output = await downloadAndSaveBase(
      testProjects,
      "" as any,
      undefined
    );

    expect(/saved to.*text\.json/.test(output)).toEqual(true);
    expect(output.match(/saved to/g)?.length).toEqual(1);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(1);
  });

  it("writes multiple files for flat format", async () => {
    cleanOutputDir();

    mockApi.get.mockResolvedValue({ data: [] });
    const output = await downloadAndSaveBase(testProjects, "flat", undefined);
    expect(/saved to.*Project 1\.json/.test(output)).toEqual(true);
    expect(/saved to.*Project 2\.json/.test(output)).toEqual(true);
    expect(output.match(/saved to/g)?.length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
  });

  it("writes multiple files for structured format", async () => {
    cleanOutputDir();

    mockApi.get.mockResolvedValue({ data: [] });
    const output = await downloadAndSaveBase(
      testProjects,
      "structured",
      undefined
    );

    expect(/saved to.*Project 1\.json/.test(output)).toEqual(true);
    expect(/saved to.*Project 2\.json/.test(output)).toEqual(true);
    expect(output.match(/saved to/g)?.length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
  });

  it("writes .xml files for android", async () => {
    cleanOutputDir();

    mockApi.get.mockResolvedValue({ data: "hello" });
    const output = await downloadAndSaveBase(
      testProjects,
      "android",
      undefined
    );

    expect(/saved to.*Project 1\.xml/.test(output)).toEqual(true);
    expect(/saved to.*Project 2\.xml/.test(output)).toEqual(true);
    expect(output.match(/saved to/g)?.length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
  });

  it("writes .strings files for ios-strings", async () => {
    cleanOutputDir();

    mockApi.get.mockResolvedValue({ data: "hello" });
    const output = await downloadAndSaveBase(
      testProjects,
      "ios-strings",
      undefined
    );

    expect(/saved to.*Project 1\.strings/.test(output)).toEqual(true);
    expect(/saved to.*Project 2\.strings/.test(output)).toEqual(true);
    expect(output.match(/saved to/g)?.length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
  });

  it("writes .stringsdict files for ios-stringsdict", async () => {
    cleanOutputDir();

    mockApi.get.mockResolvedValue({ data: "hello" });
    const output = await downloadAndSaveBase(
      testProjects,
      "ios-stringsdict",
      undefined
    );

    expect(/saved to.*Project 1\.stringsdict/.test(output)).toEqual(true);
    expect(/saved to.*Project 2\.stringsdict/.test(output)).toEqual(true);
    expect(output.match(/saved to/g)?.length).toEqual(2);
    expect(fs.readdirSync(consts.TEXT_DIR).length).toEqual(2);
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
