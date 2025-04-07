import { cleanFileName } from "./cleanFileName";

describe("cleanFileName tests", () => {
  it("correctly cleans emojis", () => {
    const folderName = "👍Good Folder";
    expect(cleanFileName(folderName)).toEqual("good-folder");

    const fileName = "👍 Good Folder";
    expect(cleanFileName(fileName)).toEqual("good-folder");
  });
});
