import { describe, expect, it } from "vitest";

import { formatOrderReference } from "./orderReference.utils";

describe("formatOrderReference", () => {
  it("shortens a UUID to a prefixed, upper-case reference", () => {
    expect(formatOrderReference("cb34b663-ef6b-495a-bd6f-cafcbb243ecf")).toBe("#CB34B663");
  });

  it("keeps an id that is already short", () => {
    expect(formatOrderReference("order-1")).toBe("#ORDER-1");
  });
});
