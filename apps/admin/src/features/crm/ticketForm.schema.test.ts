import { describe, expect, it } from "vitest";

import { ticketFormSchema } from "./ticketForm.schema";

const VALID = {
  type: "COMPLAINT" as const,
  title: "Damaged package",
  description: "Arrived torn.",
  customerUserId: "u1",
};

const messageFor = (overrides: Partial<typeof VALID>, field: keyof typeof VALID) => {
  const result = ticketFormSchema.safeParse({ ...VALID, ...overrides });
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("ticketFormSchema", () => {
  it("accepts a complete ticket", () => {
    expect(ticketFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("names each missing field", () => {
    expect(messageFor({ title: " " }, "title")).toBe("Enter a title for the ticket.");
    expect(messageFor({ description: " " }, "description")).toBe(
      "Describe the problem or request.",
    );
    expect(messageFor({ customerUserId: "" }, "customerUserId")).toBe(
      "Choose the customer this ticket is about.",
    );
  });

  it("enforces the API's length limits", () => {
    expect(messageFor({ title: "a".repeat(201) }, "title")).toBe("Use at most 200 characters.");
    expect(messageFor({ description: "a".repeat(8001) }, "description")).toBe(
      "Use at most 8000 characters.",
    );
  });
});
