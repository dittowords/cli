import fs from "fs/promises";
import path from "path";
import { findTextInJSXFiles } from "./generate-suggestions";

describe("findTextInJSXFiles", () => {
  async function createTempFile(filename, content) {
    const filePath = path.join(".", filename);
    await fs.writeFile(filePath, content);
    return filePath;
  }

  async function deleteTempFile(filename) {
    const filePath = path.join(".", filename);
    await fs.unlink(filePath);
  }

  it("should return an empty array when no files are found", async () => {
    const result = await findTextInJSXFiles(".", "searchString");

    expect(result).toEqual([]);
  });

  it("should return an empty array when searchString is not found in any file", async () => {
    const file1 = await createTempFile("file1.jsx", "<div>No match</div>");
    const file2 = await createTempFile("file2.tsx", "<div>No match</div>");

    const result = await findTextInJSXFiles(".", "searchString");

    expect(result).toEqual([]);

    await deleteTempFile(file1);
    await deleteTempFile(file2);
  });

  it("should return an array with correct occurrences when searchString is found", async () => {
    const file1 = await createTempFile(
      "file1.jsx",
      `<div>Test searchString and another searchString</div>`
    );

    const expectedResult = [
      {
        file: file1,
        occurrences: [
          {
            lineNumber: 1,
            preview:
              "<div>Test {{searchString}} and another searchString</div>",
          },
          {
            lineNumber: 1,
            preview:
              "<div>Test searchString and another {{searchString}}</div>",
          },
        ],
      },
    ];

    const result = await findTextInJSXFiles(".", "searchString");

    expect(result).toEqual(expectedResult);

    await deleteTempFile(file1);
  });
});
