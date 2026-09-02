import { addDays } from "date-fns/addDays";
import { subDays } from "date-fns/subDays";
import { describe, expect, it } from "vitest";

import type { AdminInviteRecord } from "./adminInvite.types.js";
import { toSummary } from "./adminInvite.utils.js";

const baseInvite: AdminInviteRecord = {
  id: "invite-1",
  email: "new-admin@outfiqe.test",
  name: "New Admin",
  tokenHash: "hash",
  expiresAt: addDays(new Date(), 3),
  acceptedAt: null,
  createdAt: new Date(),
  invitedById: "inviter-1",
};

describe("toSummary", () => {
  it("marks an unaccepted, unexpired invite as PENDING", () => {
    expect(toSummary(baseInvite, false).status).toBe("PENDING");
  });

  it("marks an accepted invite as ACCEPTED even if it is past its expiry", () => {
    const accepted: AdminInviteRecord = {
      ...baseInvite,
      acceptedAt: new Date(),
      expiresAt: subDays(new Date(), 1),
    };
    expect(toSummary(accepted, false).status).toBe("ACCEPTED");
  });

  it("marks an unaccepted invite past its expiry as EXPIRED", () => {
    const expired: AdminInviteRecord = { ...baseInvite, expiresAt: subDays(new Date(), 1) };
    expect(toSummary(expired, false).status).toBe("EXPIRED");
  });

  it("carries the co-founder flag through to the summary", () => {
    expect(toSummary(baseInvite, true).isCoFounder).toBe(true);
    expect(toSummary(baseInvite, false).isCoFounder).toBe(false);
  });
});
