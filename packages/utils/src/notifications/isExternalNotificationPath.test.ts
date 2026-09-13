import { describe, expect, it } from "vitest";

import { isExternalNotificationPath } from "./isExternalNotificationPath";

describe("isExternalNotificationPath", () => {
  it("flags an https link as external", () => {
    expect(isExternalNotificationPath("https://forms.gle/survey")).toBe(true);
  });

  it("flags an http link as external", () => {
    expect(isExternalNotificationPath("http://example.com")).toBe(true);
  });

  it("treats a relative in-app path as not external", () => {
    expect(isExternalNotificationPath("/events/spring-drop")).toBe(false);
  });

  it("treats null and undefined as not external", () => {
    expect(isExternalNotificationPath(null)).toBe(false);
    expect(isExternalNotificationPath(undefined)).toBe(false);
  });

  it("treats an empty string as not external", () => {
    expect(isExternalNotificationPath("")).toBe(false);
  });
});
