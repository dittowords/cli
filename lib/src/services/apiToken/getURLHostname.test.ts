import getURLHostname from "./getURLHostname";

describe("getURLHostname", () => {
  it("should return hostname when URL contains protocol", () => {
    const expectedHostName = "example.com";

    const result = getURLHostname("https://example.com");
    expect(result).toBe(expectedHostName);
  });

  it("should return host as is when no protocol present", () => {
    const expectedHostName = "example.com";

    const result = getURLHostname(expectedHostName);
    expect(result).toBe(expectedHostName);
  });
});
