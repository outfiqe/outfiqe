import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { RESOLVED_TICKET_AUTO_CLOSE_MS } from "#modules/support/support.constants.js";

import { runSupportAutoCloseSweep } from "./support.lifecycle.js";

const createResolvedTicket = (overrides: { resolvedAt: Date; reopenTokenHash?: string | null }) =>
  prisma.supportTicket.create({
    data: {
      requesterEmail: `lifecycle-${randomUUID()}@outfiqe.test`,
      requesterName: "Lifecycle Requester",
      category: "ORDER_ISSUE",
      subject: "Where is my order?",
      status: "RESOLVED",
      resolvedAt: overrides.resolvedAt,
      reopenTokenHash: overrides.reopenTokenHash ?? "hashed-reopen-token",
    },
  });

describe("runSupportAutoCloseSweep", () => {
  it("closes a resolved request past the auto-close window and clears its reopen token", async () => {
    const ticket = await createResolvedTicket({
      resolvedAt: new Date(Date.now() - RESOLVED_TICKET_AUTO_CLOSE_MS - 1000),
    });

    await runSupportAutoCloseSweep();

    const updated = await prisma.supportTicket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(updated.status).toBe("CLOSED");
    expect(updated.reopenTokenHash).toBeNull();
  });

  it("leaves a recently resolved request untouched", async () => {
    const ticket = await createResolvedTicket({ resolvedAt: new Date() });

    await runSupportAutoCloseSweep();

    const updated = await prisma.supportTicket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(updated.status).toBe("RESOLVED");
    expect(updated.reopenTokenHash).not.toBeNull();
  });
});
