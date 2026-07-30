import crypto from "crypto";
import { createPKCEPair, createState } from "./pkce";

describe("createPKCEPair", () => {
  it("derives the challenge as the S256 hash of the verifier", () => {
    const { verifier, challenge } = createPKCEPair();

    expect(challenge).toBe(
      crypto.createHash("sha256").update(verifier).digest("base64url")
    );
  });

  it("is URL-safe, so it survives a query string intact", () => {
    const { verifier, challenge } = createPKCEPair();

    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("generates a new verifier per call", () => {
    expect(createPKCEPair().verifier).not.toBe(createPKCEPair().verifier);
    expect(createState()).not.toBe(createState());
  });
});
