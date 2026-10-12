import { describe, expect, it } from "vitest";

import { buildDealFormSchema, dealValueFrom } from "./dealForm.schema";

const VALID = {
  title: "Spring collab",
  stageId: "stage-1",
  value: "1500",
  partnerCreatorId: "p-1",
};

const messageFor = (
  isEditing: boolean,
  overrides: Partial<typeof VALID>,
  field: keyof typeof VALID,
) => {
  const result = buildDealFormSchema(isEditing).safeParse({ ...VALID, ...overrides });
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("buildDealFormSchema", () => {
  it("accepts a complete new deal", () => {
    expect(buildDealFormSchema(false).safeParse(VALID).success).toBe(true);
  });

  it("asks for a title and a stage", () => {
    expect(messageFor(false, { title: " " }, "title")).toBe("Enter a title for the deal.");
    expect(messageFor(false, { stageId: "" }, "stageId")).toBe("Choose a stage.");
  });

  it("requires a partner for a new deal but not when editing", () => {
    expect(messageFor(false, { partnerCreatorId: "" }, "partnerCreatorId")).toBe(
      "Choose the partner for this deal.",
    );
    expect(messageFor(true, { partnerCreatorId: "" }, "partnerCreatorId")).toBeUndefined();
  });

  it("accepts an empty value but rejects decimals, negatives and huge numbers", () => {
    expect(messageFor(false, { value: "" }, "value")).toBeUndefined();
    expect(messageFor(false, { value: "12.5" }, "value")).toBe(
      "Enter a whole number of rupees, with no decimals or minus sign.",
    );
    expect(messageFor(false, { value: "-3" }, "value")).toBe(
      "Enter a whole number of rupees, with no decimals or minus sign.",
    );
    expect(messageFor(false, { value: "1000000001" }, "value")).toBe("That value is too large.");
  });
});

describe("dealValueFrom", () => {
  it("treats an empty value as zero", () => {
    expect(dealValueFrom("")).toBe(0);
    expect(dealValueFrom("2500")).toBe(2500);
  });
});
