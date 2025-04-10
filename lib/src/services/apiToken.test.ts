import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { _test as apiTokenTest } from "./apiToken";

const { getURLHostname } = apiTokenTest;

describe("apiToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getURLHostname", () => {
    it("should return hostname when URL contains protocol", () => {
      const expectedHostName = "example.com";

      const result = getURLHostname("https://example.com");

      expect(result).toBe(expectedHostName);
    });

    it("should return host as is when no protocol present", () => {
      const expectedHostName = "example.com";

      const result = getURLHostname("example.com");
      expect(result).toBe("example.com");
    });
  });

  // TODO: Add tests
});
