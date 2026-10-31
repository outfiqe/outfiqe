import { describe, expect, it } from "vitest";

import { toPlainAuditLabel } from "./auditLabels.utils";

describe("toPlainAuditLabel", () => {
  it.each([
    ["support.ticket.status_changed", "Support ticket status changed"],
    ["outfit-build.archived-by-admin", "Outfit build archived by admin"],
    ["Outfit", "Outfit"],
    ["feature-flag", "Feature flag"],
  ])("reads %s as %s", (code, label) => {
    expect(toPlainAuditLabel(code)).toBe(label);
  });
});
