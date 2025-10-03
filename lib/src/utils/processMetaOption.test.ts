import processMetaOption from "./processMetaOption";

describe("processMetaOption tests", () => {
  it("It parses correctly", () => {
    expect(
      processMetaOption(["githubActionRequest:true", "trigger:manual"])
    ).toEqual({
      githubActionRequest: "true",
      trigger: "manual",
    });
  });

  it("Successfully parses entries without : as key with undefined value", () => {
    expect(processMetaOption(["context:github-action", "trigger"])).toEqual({
      context: "github-action",
      trigger: undefined,
    });
  });

  it("Ignores entries with multiple : in them", () => {
    expect(
      processMetaOption(["context:github-action", "trigger:manual:ci"])
    ).toEqual({
      context: "github-action",
    });
  });
});
