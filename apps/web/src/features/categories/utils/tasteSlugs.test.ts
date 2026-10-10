import { describe, expect, it } from "vitest";

import { parseTasteCookie, parseTasteSlugs, serializeTasteSlugs } from "./tasteSlugs";

describe("parseTasteSlugs", () => {
  it("parses a JSON array of strings", () => {
    expect(parseTasteSlugs('["tops","dresses"]')).toEqual(["tops", "dresses"]);
  });

  it("returns null for an empty, missing, or malformed value", () => {
    expect(parseTasteSlugs(null)).toBeNull();
    expect(parseTasteSlugs(undefined)).toBeNull();
    expect(parseTasteSlugs("")).toBeNull();
    expect(parseTasteSlugs("not json")).toBeNull();
    expect(parseTasteSlugs('{"slugs":["tops"]}')).toBeNull();
    expect(parseTasteSlugs("[1,2,3]")).toBeNull();
  });
});

describe("parseTasteCookie", () => {
  it("decodes a URL-encoded cookie value before parsing", () => {
    const raw = encodeURIComponent(serializeTasteSlugs(["tops", "outerwear"]));
    expect(parseTasteCookie(raw)).toEqual(["tops", "outerwear"]);
  });

  it("returns null for a missing or undecodable value", () => {
    expect(parseTasteCookie(undefined)).toBeNull();
    expect(parseTasteCookie("%")).toBeNull();
  });
});
