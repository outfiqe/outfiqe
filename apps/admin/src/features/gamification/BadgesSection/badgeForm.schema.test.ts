import { describe, expect, it } from "vitest";

import { validateWithSchema } from "@/lib/zodFieldErrors";

import { challengeFormSchema } from "../ChallengesSection/challengeForm.schema";
import { pickBadgeFormSchema } from "./badgeForm.schema";

const ruleBasedBadge = {
  name: "Fashion Warrior",
  description: "Wore ten looks",
  icon: "",
  xpReward: "0",
  conditions: [{ metric: "total_likes", operator: "gte", value: "5" }],
  activeFrom: "",
  activeUntil: "",
};

describe("pickBadgeFormSchema", () => {
  it("accepts a rule-based badge with a blank icon and no season", () => {
    expect(validateWithSchema(pickBadgeFormSchema(false), ruleBasedBadge)).toEqual({});
  });

  it("names the field behind each problem", () => {
    const errors = validateWithSchema(pickBadgeFormSchema(false), {
      ...ruleBasedBadge,
      name: "",
      xpReward: "1.5",
      conditions: [{ metric: "total_likes", operator: "gte", value: "" }],
    });

    expect(errors).toMatchObject({
      name: "Enter a badge name.",
      xpReward: "Use a whole number with no decimals or minus sign.",
      "conditions.0.value": "Enter a value.",
    });
  });

  it("does not ask for conditions on an admin-award badge but checks its limit", () => {
    const adminAwardBadge = { ...ruleBasedBadge, conditions: [], assignmentLimit: "0" };

    expect(validateWithSchema(pickBadgeFormSchema(true), adminAwardBadge)).toEqual({
      assignmentLimit: "Use a number that is at least 1, or leave blank for unlimited.",
    });
    expect(
      validateWithSchema(pickBadgeFormSchema(true), { ...adminAwardBadge, assignmentLimit: "" }),
    ).toEqual({});
  });

  it("rejects a season that ends before it starts", () => {
    expect(
      validateWithSchema(pickBadgeFormSchema(false), {
        ...ruleBasedBadge,
        activeFrom: "2030-02-01T10:00",
        activeUntil: "2030-01-01T10:00",
      }),
    ).toEqual({ activeUntil: "The season must end after it starts." });
  });
});

describe("challengeFormSchema", () => {
  const challenge = {
    challengeName: "Summer Sprint",
    challengeDescription: "Post three looks.",
    activeFrom: "2030-01-01T10:00",
    activeUntil: "2030-01-08T10:00",
    name: "Sprinter",
    icon: "🏃",
    description: "Finished the sprint.",
    xpReward: "100",
    conditions: [{ metric: "posts_created", operator: "gte", value: "3" }],
  };

  it("accepts a complete challenge", () => {
    expect(validateWithSchema(challengeFormSchema, challenge)).toEqual({});
  });

  it("requires both dates and an icon", () => {
    expect(
      validateWithSchema(challengeFormSchema, {
        ...challenge,
        activeFrom: "",
        activeUntil: "",
        icon: "",
      }),
    ).toMatchObject({
      activeFrom: "Choose when the challenge starts.",
      activeUntil: "Choose when the challenge ends.",
      icon: "Enter an icon for the badge.",
    });
  });

  it("rejects an end date that is not after the start", () => {
    expect(
      validateWithSchema(challengeFormSchema, { ...challenge, activeUntil: "2030-01-01T10:00" }),
    ).toEqual({ activeUntil: "The challenge must end after it starts." });
  });
});
