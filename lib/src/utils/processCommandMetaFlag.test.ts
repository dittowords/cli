import processCommandMetaFlag from "./processCommandMetaFlag";

describe("processCommandMetaFlag tests", () => {
  it("It parses correctly", () => {
    expect(
      processCommandMetaFlag(["githubActionRequest:true", "trigger:manual"])
    ).toEqual({
      githubActionRequest: "true",
      trigger: "manual",
    });
  });

  it("Successfully parses entries without : as key with undefined value", () => {
    expect(
      processCommandMetaFlag(["context:github-action", "trigger"])
    ).toEqual({
      context: "github-action",
      trigger: undefined,
    });
  });

  it("Ignores entries with multiple : in them", () => {
    expect(
      processCommandMetaFlag(["context:github-action", "trigger:manual:ci"])
    ).toEqual({
      context: "github-action",
    });
  });
});
