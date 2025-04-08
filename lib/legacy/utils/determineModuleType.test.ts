import { determineModuleType } from "./determineModuleType";
import { vol } from "memfs";

const defaultEnv = process.env;

jest.mock("fs");

beforeEach(() => {
  vol.reset();
  process.env = { ...defaultEnv };
});

test("'commonjs' if no package.json found", () => {
  expect(determineModuleType()).toBe("commonjs");
});

test("'commonjs' if package.json found but no `type` property", () => {
  vol.fromJSON({ "package.json": JSON.stringify({}) }, process.cwd());
  expect(determineModuleType()).toBe("commonjs");
});

test("'commonjs' if package.json found and `type` property is 'commonjs'", () => {
  vol.fromJSON({ "package.json": JSON.stringify({ type: "commonjs" }) });
  expect(determineModuleType()).toBe("commonjs");
});

test("'commonjs' if package.json found and `type` property is invalid", () => {
  vol.fromJSON({ "package.json": JSON.stringify({ type: "invalid-type" }) });
  expect(determineModuleType()).toBe("commonjs");
});

test("'module' if package.json found and `type` property is 'module'", () => {
  vol.fromJSON({ "package.json": JSON.stringify({ type: "module" }) });
  expect(determineModuleType()).toBe("module");
});

test("finds package.json in parent directories", () => {
  vol.fromJSON({
    "/some/nested/dir/test.txt": "",
    "/package.json": JSON.stringify({ type: "module" }),
  });
  expect(determineModuleType("/some/nested/dir")).toBe("module");
});

test("supports explicit specification of module type via environment variable", () => {
  process.env.DITTO_MODULE_TYPE = "module";
  expect(determineModuleType()).toBe("module");
});
