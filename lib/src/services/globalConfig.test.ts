import fs from "fs";
import os from "os";
import path from "path";
import yaml from "js-yaml";
import * as configService from "./globalConfig";

describe("globalConfig", () => {
  let file: string;

  beforeEach(() => {
    file = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "ditto-config-")),
      "ditto"
    );
  });

  // A schema miss falls back to {}, signing out every existing user on upgrade.
  it("still reads a config written before OAuth existed", () => {
    fs.writeFileSync(
      file,
      yaml.dump({ "api.dittowords.com": [{ token: "abc.def" }] })
    );

    expect(configService.readCredential(file, "api.dittowords.com")).toEqual({
      token: "abc.def",
    });
  });

  // The file holds API keys and refresh tokens, so nobody else on the box gets to
  // read it.
  it("writes the config owner-only", () => {
    configService.saveToken(file, "api.dittowords.com", "abc.def");

    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });

  it("round-trips an OAuth session", () => {
    const oauth = { accessToken: "at", refreshToken: "rt", expiresAt: 1234 };

    configService.saveOAuthSession(file, "api.dittowords.com", oauth);

    expect(
      configService.readCredential(file, "api.dittowords.com")?.oauth
    ).toEqual(oauth);
  });

  it("replaces a stored API key when a session is saved for the same host", () => {
    configService.saveToken(file, "api.dittowords.com", "abc.def");
    configService.saveOAuthSession(file, "api.dittowords.com", {
      accessToken: "at",
      expiresAt: 1,
    });

    const entry = configService.readCredential(file, "api.dittowords.com");
    expect(entry?.token).toBe("");
    expect(entry?.oauth?.accessToken).toBe("at");
  });

  it("leaves other hosts intact when clearing one", () => {
    configService.saveToken(file, "api.dittowords.com", "a.a");
    configService.saveToken(file, "kooky-api.dittowords.com", "b.b");

    configService.clearCredential(file, "api.dittowords.com");

    expect(
      configService.readCredential(file, "api.dittowords.com")?.token
    ).toBe("");
    expect(
      configService.readCredential(file, "kooky-api.dittowords.com")
    ).toEqual({
      token: "b.b",
    });
  });

  /**
   * Legacy mode reads this same file, requires a `token` key on every entry, and
   * indexes the entry list unguarded — so an emptied host must keep one entry.
   */
  it("stays readable by legacy mode after OAuth writes", () => {
    configService.saveOAuthSession(file, "api.dittowords.com", {
      accessToken: "at",
      expiresAt: 1,
    });
    configService.clearCredential(file, "kooky-api.dittowords.com");

    const raw = yaml.load(fs.readFileSync(file, "utf8")) as Record<
      string,
      { token?: string }[]
    >;

    for (const entries of Object.values(raw)) {
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(Object.keys(entry)).toContain("token");
      }
    }
  });
});
