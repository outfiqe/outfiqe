import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  organization: { update: vi.fn(), findMany: vi.fn() },
  contact: { count: vi.fn(), findFirst: vi.fn() },
  deal: { count: vi.fn(), findFirst: vi.fn() },
  crmTicket: { count: vi.fn(), findFirst: vi.fn() },
  crmActivity: { count: vi.fn(), findFirst: vi.fn() },
}));

vi.mock("#db/prisma.js", () => ({ prisma: prismaMock }));

const { applyCrmCounterDelta, recomputeCrmCounters, touchCrmActivity } =
  await import("./crm-counters.js");

afterEach(() => {
  vi.clearAllMocks();
});

describe("applyCrmCounterDelta", () => {
  it("increments the field and touches last-activity by default", async () => {
    await applyCrmCounterDelta("org-1", "dealCount", 1);

    expect(prismaMock.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: expect.objectContaining({
        dealCount: { increment: 1 },
        lastCrmActivityAt: expect.any(Date),
      }),
    });
  });

  it("decrements the field when the delta is negative", async () => {
    await applyCrmCounterDelta("org-1", "ticketCount", -1);

    expect(prismaMock.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: expect.objectContaining({ ticketCount: { decrement: 1 } }),
    });
  });

  it("skips touching last-activity when told not to", async () => {
    await applyCrmCounterDelta("org-1", "contactCount", 1, { touchLastActivity: false });

    const [[{ data }]] = prismaMock.organization.update.mock.calls;
    expect(data).not.toHaveProperty("lastCrmActivityAt");
  });
});

describe("touchCrmActivity", () => {
  it("stamps the organization's last CRM activity time", async () => {
    await touchCrmActivity("org-1");

    expect(prismaMock.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { lastCrmActivityAt: expect.any(Date) },
    });
  });
});

describe("recomputeCrmCounters", () => {
  const emptyCounts = () => {
    prismaMock.contact.count.mockResolvedValue(0);
    prismaMock.deal.count.mockResolvedValue(0);
    prismaMock.crmTicket.count.mockResolvedValue(0);
    prismaMock.crmActivity.count.mockResolvedValue(0);
  };

  it("returns zero and updates nothing when there are no organizations", async () => {
    prismaMock.organization.findMany.mockResolvedValue([]);

    const updated = await recomputeCrmCounters();

    expect(updated).toBe(0);
    expect(prismaMock.organization.update).not.toHaveBeenCalled();
  });

  it("uses the latest of several activity timestamps", async () => {
    prismaMock.organization.findMany.mockResolvedValue([{ id: "org-1" }]);
    emptyCounts();
    prismaMock.crmActivity.findFirst.mockResolvedValue({ occurredAt: new Date("2026-01-01") });
    prismaMock.deal.findFirst.mockResolvedValue({ updatedAt: new Date("2026-01-03") });
    prismaMock.crmTicket.findFirst.mockResolvedValue({ updatedAt: new Date("2026-01-02") });
    prismaMock.contact.findFirst.mockResolvedValue(null);

    const updated = await recomputeCrmCounters();

    expect(updated).toBe(1);
    expect(prismaMock.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: expect.objectContaining({ lastCrmActivityAt: new Date("2026-01-03") }),
    });
  });

  it("leaves last-activity null when no source has a timestamp", async () => {
    prismaMock.organization.findMany.mockResolvedValue([{ id: "org-1" }]);
    emptyCounts();
    prismaMock.crmActivity.findFirst.mockResolvedValue(null);
    prismaMock.deal.findFirst.mockResolvedValue(null);
    prismaMock.crmTicket.findFirst.mockResolvedValue(null);
    prismaMock.contact.findFirst.mockResolvedValue(null);

    await recomputeCrmCounters();

    expect(prismaMock.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: expect.objectContaining({ lastCrmActivityAt: null }),
    });
  });
});
