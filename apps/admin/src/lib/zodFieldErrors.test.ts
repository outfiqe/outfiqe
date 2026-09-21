import { describe, expect, it } from "vitest";
import { z } from "zod";

import { collectFieldErrors, validateWithSchema } from "./zodFieldErrors";

const schema = z.object({
  name: z.string().min(1, "Enter a name.").min(3, "Use at least 3 characters."),
  rows: z.array(z.object({ value: z.string().min(1, "Enter a value.") })),
});

describe("zodFieldErrors", () => {
  it("keeps the first message for each field", () => {
    const result = schema.safeParse({ name: "", rows: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(collectFieldErrors(result.error)).toEqual({ name: "Enter a name." });
    }
  });

  it("keys nested errors by their dotted path", () => {
    expect(
      validateWithSchema(schema, { name: "abc", rows: [{ value: "x" }, { value: "" }] }),
    ).toEqual({ "rows.1.value": "Enter a value." });
  });

  it("returns no errors for valid values", () => {
    expect(validateWithSchema(schema, { name: "abc", rows: [] })).toEqual({});
  });
});
