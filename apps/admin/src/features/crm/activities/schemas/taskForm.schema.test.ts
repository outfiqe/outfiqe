import { describe, expect, it } from "vitest";

import { taskFormSchema } from "./taskForm.schema";

const VALID = { title: "Chase invoice", assigneeMembershipId: "m1", dueAt: "" };

const messageFor = (overrides: Partial<typeof VALID>, field: keyof typeof VALID) => {
  const result = taskFormSchema.safeParse({ ...VALID, ...overrides });
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("taskFormSchema", () => {
  it("accepts a task without a due date", () => {
    expect(taskFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("asks for a title and an assignee", () => {
    expect(messageFor({ title: "  " }, "title")).toBe("Enter a title for the task.");
    expect(messageFor({ assigneeMembershipId: "" }, "assigneeMembershipId")).toBe(
      "Choose who this task is for.",
    );
  });

  it("rejects a title over 200 characters", () => {
    expect(messageFor({ title: "a".repeat(201) }, "title")).toBe("Use at most 200 characters.");
  });
});
