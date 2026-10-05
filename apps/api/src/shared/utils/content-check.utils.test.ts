import { describe, expect, it } from "vitest";

import { CONTENT_REFUSAL } from "#constants/content-check.constants.js";

import { assertContentAllowed, findContentRefusal } from "./content-check.utils.js";

describe("findContentRefusal", () => {
  it("lets ordinary text through, in English and Nepali", () => {
    expect(findContentRefusal("Love this Dashain look! The maroon kurta is perfect.")).toBeNull();
    expect(findContentRefusal("यो लुक धेरै राम्रो छ")).toBeNull();
    expect(findContentRefusal("Dickens would approve, and so would Scunthorpe")).toBeNull();
  });

  it("refuses blocked words, including plurals, lookalike characters and Devanagari", () => {
    expect(findContentRefusal("what a bitch")).toBe(CONTENT_REFUSAL.BLOCKED_TERM);
    expect(findContentRefusal("total b1tches")).toBe(CONTENT_REFUSAL.BLOCKED_TERM);
    expect(findContentRefusal("sh!t fit")).toBe(CONTENT_REFUSAL.BLOCKED_TERM);
    expect(findContentRefusal("MUJI")).toBe(CONTENT_REFUSAL.BLOCKED_TERM);
    expect(findContentRefusal("तँ मुजी")).toBe(CONTENT_REFUSAL.BLOCKED_TERM);
  });

  it("refuses links to other sites but allows Outfiqe links", () => {
    expect(findContentRefusal("cheaper at https://knockoffs.example.com")).toBe(
      CONTENT_REFUSAL.EXTERNAL_LINK,
    );
    expect(findContentRefusal("go to cheapfits.shop now")).toBe(CONTENT_REFUSAL.EXTERNAL_LINK);
    expect(findContentRefusal("see https://outfiqe.com/builds/1")).toBeNull();
  });

  it("refuses phone numbers and email addresses", () => {
    expect(findContentRefusal("call 9841234567 for price")).toBe(CONTENT_REFUSAL.CONTACT_DETAILS);
    expect(findContentRefusal("whatsapp +977 980-123-4567")).toBe(CONTENT_REFUSAL.CONTACT_DETAILS);
    expect(findContentRefusal("mail me sita@example.np")).toBe(CONTENT_REFUSAL.CONTACT_DETAILS);
  });

  it("refuses long runs of the same character", () => {
    expect(findContentRefusal("sooooooooo good")).toBe(CONTENT_REFUSAL.REPEATED_CHARACTERS);
    expect(findContentRefusal("soooo good")).toBeNull();
  });
});

describe("assertContentAllowed", () => {
  it("does nothing for allowed or empty text", () => {
    expect(() => assertContentAllowed("Nice")).not.toThrow();
    expect(() => assertContentAllowed(null)).not.toThrow();
    expect(() => assertContentAllowed(undefined)).not.toThrow();
  });

  it("throws a 422 naming the reason", () => {
    expect(() => assertContentAllowed("call 9841234567")).toThrow(
      expect.objectContaining({
        code: "CONTENT_NOT_ALLOWED",
        status: 422,
        details: { reason: CONTENT_REFUSAL.CONTACT_DETAILS },
      }),
    );
  });
});
