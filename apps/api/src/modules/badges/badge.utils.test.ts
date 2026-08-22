import { describe, expect, it } from "vitest";

import { parseDesignConfig } from "./badge.utils.js";

describe("parseDesignConfig", () => {
  it("returns the parsed config for a valid shape", () => {
    expect(parseDesignConfig({ shape: "star", primaryColor: "#f97316" })).toEqual({
      shape: "star",
      primaryColor: "#f97316",
    });
  });

  it("returns null for an unsupported shape value", () => {
    expect(parseDesignConfig({ shape: "octagon", primaryColor: "#f97316" })).toBeNull();
  });

  it("returns null when primaryColor is missing", () => {
    expect(parseDesignConfig({ shape: "circle" })).toBeNull();
  });

  it("returns null for null, undefined, or a non-object value", () => {
    expect(parseDesignConfig(null)).toBeNull();
    expect(parseDesignConfig(undefined)).toBeNull();
    expect(parseDesignConfig("circle")).toBeNull();
  });
});
