import { kMaxLength } from "buffer";
import { applyMixins, Constructor } from "./index";

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe("applyMixins", () => {
  // Base class
  class Base {
    baseMethod() {
      return "base";
    }
  }

  // First mixin
  const TimestampMixin = <TBase extends Constructor>(base: TBase) => {
    return class extends base {
      timestamp = Date.now();
      getTimestamp() {
        return this.timestamp;
      }
    };
  };

  // Second mixin
  const LoggingMixin = <TBase extends Constructor>(base: TBase) => {
    return class extends base {
      log(message: string) {
        console.log(message);
        return message;
      }
    };
  };

  it("should apply a single mixin", () => {
    const MixedClass = applyMixins(Base, TimestampMixin);
    const instance = new MixedClass();

    expect(instance.baseMethod()).toBe("base");
    expect(instance.getTimestamp()).toBeDefined();
    expect(typeof instance.getTimestamp()).toBe("number");
  });

  it("should apply multiple mixins", () => {
    const MixedClass = applyMixins(Base, TimestampMixin, LoggingMixin);
    const instance = new MixedClass();

    // Base class methods
    expect(instance.baseMethod()).toBe("base");

    // First mixin methods
    expect(instance.getTimestamp()).toBeDefined();
    expect(typeof instance.getTimestamp()).toBe("number");

    // Second mixin methods
    const message = "test message";
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    expect(instance.log(message)).toBe(message);
    expect(consoleSpy).toHaveBeenCalledWith(message);
    consoleSpy.mockRestore();
  });

  it("should maintain the prototype chain", () => {
    const MixedClass = applyMixins(Base, TimestampMixin, LoggingMixin);
    const instance = new MixedClass();

    expect(instance instanceof Base).toBe(true);
    expect(instance instanceof MixedClass).toBe(true);
  });
});
