import fs from "fs/promises";
import { parseOptions, replaceJSXTextInFile } from "./replace"; // Assuming the function is exported in a separate file

// Helper function to create a temporary file
async function createTempJSXFile(content: string): Promise<string> {
  const tempFile = "tempFile.jsx";
  await fs.writeFile(tempFile, content);
  return tempFile;
}

// Helper function to delete the temporary file
async function deleteTempFile(filePath: string): Promise<void> {
  await fs.unlink(filePath);
}

describe("parseOptions", () => {
  test("should pass with valid input", async () => {
    const tempFile = await createTempJSXFile("<div>Hello, world!</div>");
    expect(() =>
      parseOptions([tempFile, "secondString", "thirdString"])
    ).not.toThrow();

    const result = parseOptions([tempFile, "secondString", "thirdString"]);
    expect(result).toEqual({
      filePath: tempFile,
      searchString: "secondString",
      replaceWith: "thirdString",
    });

    deleteTempFile(tempFile);
  });

  test("should throw error when options array does not have exactly three strings", () => {
    expect(() => parseOptions(["oneString"])).toThrow(
      "The options array must contain <file path> <search string> <replace with>."
    );
    expect(() => parseOptions(["one", "two"])).toThrow(
      "The options array must contain <file path> <search string> <replace with>."
    );
    expect(() => parseOptions(["one", "two", "three", "four"])).toThrow(
      "The options array must contain <file path> <search string> <replace with>."
    );
  });

  test("should throw error when the first string is not a valid file path", () => {
    const invalidFilePath = "/path/to/invalid/file.txt";
    expect(() =>
      parseOptions([invalidFilePath, "secondString", "thirdString"])
    ).toThrow(`${invalidFilePath} is not a valid file path.`);
  });

  test("should throw error when the first string is a directory", () => {
    const directoryPath = ".";
    expect(() =>
      parseOptions([directoryPath, "secondString", "thirdString"])
    ).toThrow(`${directoryPath} is not a valid file path.`);
  });
});

// TODO: this is flaky
describe("replaceJSXTextInFile", () => {
  afterEach(async () => {
    await deleteTempFile("tempFile.jsx");
  });

  test("should replace JSX text with a DittoComponent", async () => {
    const tempFile = await createTempJSXFile("<div>Hello, world</div>");
    const searchString = "world";
    const replaceWith = "some-id";

    await replaceJSXTextInFile(tempFile, { searchString, replaceWith }, {});

    const transformedCode = await fs.readFile(tempFile, "utf-8");
    expect(transformedCode).toContain(
      `<div>Hello, <DittoComponent componentId="${replaceWith}" /></div>`
    );
  });

  test("should replace JSX text with a DittoComponent with a flag", async () => {
    const tempFile = await createTempJSXFile(
      `<>\n<div>Hello, world</div>\n<div>Hello, world</div>\n</>`
    );
    const searchString = "world";
    const replaceWith = "some-id";

    await replaceJSXTextInFile(
      tempFile,
      { searchString, replaceWith },
      { lineNumbers: [3] }
    );

    const transformedCode = await fs.readFile(tempFile, "utf-8");
    expect(transformedCode).toContain(
      `<>\n  <div>Hello, world</div>\n  <div>Hello, <DittoComponent componentId=\"some-id\" /></div>\n</>;`
    );
  });

  test("should handle case-insensitive search", async () => {
    const tempFile = await createTempJSXFile("<div>HeLLo, WoRlD</div>");
    const searchString = "world";
    const replaceWith = "some-id";

    await replaceJSXTextInFile(tempFile, { searchString, replaceWith }, {});

    const transformedCode = await fs.readFile(tempFile, "utf-8");
    expect(transformedCode).toContain(
      `<div>HeLLo, <DittoComponent componentId="${replaceWith}" /></div>`
    );
  });

  test("should not replace JSX text if searchString is not found", async () => {
    const tempFile = await createTempJSXFile("<div>Hello, world!</div>");
    const searchString = "foobar";
    const replaceWith = "some-id";

    await replaceJSXTextInFile(tempFile, { searchString, replaceWith }, {});

    const transformedCode = await fs.readFile(tempFile, "utf-8");
    expect(transformedCode).toContain("<div>Hello, world!</div>");
  });
});
