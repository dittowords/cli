import {
  extractAndroidLocaleFromPath,
  extractIosLocaleFromPath,
  extractLocaleFromPath,
} from "./i18n-file-discovery";

describe("extractLocaleFromPath", () => {
  test("locale as the whole filename stem", () => {
    expect(extractLocaleFromPath("locales/en.json")).toBe("en");
    expect(extractLocaleFromPath("i18n/de-DE.json")).toBe("de-DE");
    expect(extractLocaleFromPath("translations/zh_CN.yaml")).toBe("zh_CN");
  });

  test("locale as a trailing dot-segment in the filename", () => {
    expect(extractLocaleFromPath("messages.en.json")).toBe("en");
    expect(extractLocaleFromPath("app/labels.fr-CA.json")).toBe("fr-CA");
  });

  test("locale as an underscore suffix in the filename stem", () => {
    expect(extractLocaleFromPath("messages_en.properties")).toBe("en");
    expect(extractLocaleFromPath("ApplicationResources_fr.properties")).toBe(
      "fr"
    );
    expect(extractLocaleFromPath("labels_de-DE.json")).toBe("de-DE");
  });

  test("locale as a directory segment", () => {
    expect(extractLocaleFromPath("locales/en/common.json")).toBe("en");
    expect(extractLocaleFromPath("public/locales/de-DE/translation.json")).toBe(
      "de-DE"
    );
  });

  test("filename token wins over a directory segment", () => {
    expect(extractLocaleFromPath("locales/en/messages.fr.json")).toBe("fr");
  });

  test("deepest directory segment wins", () => {
    expect(extractLocaleFromPath("en/locales/de/common.json")).toBe("de");
  });

  test("null when no path token reads as a locale", () => {
    expect(extractLocaleFromPath("locales/translations.json")).toBe(null);
    expect(extractLocaleFromPath("i18n/strings.yaml")).toBe(null);
  });

  test("does not treat non-locale two-letter tokens as locales", () => {
    expect(extractLocaleFromPath("db/messages.json")).toBe(null);
    expect(extractLocaleFromPath("ui/go/strings.json")).toBe(null);
  });
});

describe("extractAndroidLocaleFromPath", () => {
  test("plain language qualifier", () => {
    expect(extractAndroidLocaleFromPath("app/src/main/res/values-fr/strings.xml")).toBe("fr");
  });

  test("normalizes the r-prefixed region", () => {
    expect(extractAndroidLocaleFromPath("res/values-fr-rCA/strings.xml")).toBe("fr-CA");
    expect(extractAndroidLocaleFromPath("res/values-zh-rCN/strings.xml")).toBe("zh-CN");
  });

  test("normalizes the BCP-47 b+ form", () => {
    expect(extractAndroidLocaleFromPath("res/values-b+sr+Latn/strings.xml")).toBe("sr-Latn");
  });

  test("locale qualifier mixed with other qualifiers", () => {
    expect(extractAndroidLocaleFromPath("res/values-fr-rCA-night/strings.xml")).toBe("fr-CA");
    expect(extractAndroidLocaleFromPath("res/values-mcc310-en-rUS/strings.xml")).toBe("en-US");
  });

  test("null for the default dir and non-locale qualifiers", () => {
    expect(extractAndroidLocaleFromPath("res/values/strings.xml")).toBe(null);
    expect(extractAndroidLocaleFromPath("res/values-night/strings.xml")).toBe(null);
    expect(extractAndroidLocaleFromPath("res/values-v21/strings.xml")).toBe(null);
    expect(extractAndroidLocaleFromPath("res/values-sw600dp/strings.xml")).toBe(null);
  });
});

describe("extractIosLocaleFromPath", () => {
  test("language and language-region bundles", () => {
    expect(extractIosLocaleFromPath("App/en.lproj/Localizable.strings")).toBe("en");
    expect(extractIosLocaleFromPath("App/pt-BR.lproj/Localizable.strings")).toBe("pt-BR");
  });

  test("script and multi-subtag tags", () => {
    expect(extractIosLocaleFromPath("zh-Hans.lproj/Localizable.strings")).toBe("zh-Hans");
    expect(extractIosLocaleFromPath("zh-Hant-TW.lproj/Localizable.stringsdict")).toBe("zh-Hant-TW");
  });

  test("null for Base.lproj and non-lproj paths", () => {
    expect(extractIosLocaleFromPath("App/Base.lproj/Localizable.strings")).toBe(null);
    expect(extractIosLocaleFromPath("App/Localizable.strings")).toBe(null);
  });
});
