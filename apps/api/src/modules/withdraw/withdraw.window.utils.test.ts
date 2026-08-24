import { describe, expect, it } from "vitest";

import { WithdrawWindowType } from "#generated/prisma/enums.js";

import { computeWithdrawWindow } from "./withdraw.window.utils.js";

describe("computeWithdrawWindow — MONTHLY", () => {
  it("is open in the last windowValue days of the month", () => {
    const now = new Date("2026-01-28T12:00:00.000Z");
    const result = computeWithdrawWindow(
      { windowType: WithdrawWindowType.MONTHLY, windowValue: 5, createdAt: now },
      now,
    );

    expect(result.isOpen).toBe(true);
  });

  it("is closed earlier in the month", () => {
    const now = new Date("2026-01-10T12:00:00.000Z");
    const result = computeWithdrawWindow(
      { windowType: WithdrawWindowType.MONTHLY, windowValue: 5, createdAt: now },
      now,
    );

    expect(result.isOpen).toBe(false);
  });
});

describe("computeWithdrawWindow — WEEKLY", () => {
  it("is open in the last windowValue days of the ISO week", () => {
    const sunday = new Date("2026-01-25T12:00:00.000Z");
    const result = computeWithdrawWindow(
      { windowType: WithdrawWindowType.WEEKLY, windowValue: 2, createdAt: sunday },
      sunday,
    );

    expect(result.isOpen).toBe(true);
  });

  it("is closed earlier in the ISO week", () => {
    const monday = new Date("2026-01-19T12:00:00.000Z");
    const result = computeWithdrawWindow(
      { windowType: WithdrawWindowType.WEEKLY, windowValue: 2, createdAt: monday },
      monday,
    );

    expect(result.isOpen).toBe(false);
  });
});

describe("computeWithdrawWindow — CUSTOM_DAYS", () => {
  it("is open on the anchor day and closed the day after", () => {
    const anchor = new Date("2026-01-01T00:00:00.000Z");
    const openDay = new Date("2026-01-01T18:00:00.000Z");
    const closedDay = new Date("2026-01-02T06:00:00.000Z");

    const openResult = computeWithdrawWindow(
      { windowType: WithdrawWindowType.CUSTOM_DAYS, windowValue: 14, createdAt: anchor },
      openDay,
    );
    const closedResult = computeWithdrawWindow(
      { windowType: WithdrawWindowType.CUSTOM_DAYS, windowValue: 14, createdAt: anchor },
      closedDay,
    );

    expect(openResult.isOpen).toBe(true);
    expect(closedResult.isOpen).toBe(false);
  });

  it("re-opens after a full cycle", () => {
    const anchor = new Date("2026-01-01T00:00:00.000Z");
    const nextCycleOpenDay = new Date("2026-01-15T06:00:00.000Z");

    const result = computeWithdrawWindow(
      { windowType: WithdrawWindowType.CUSTOM_DAYS, windowValue: 14, createdAt: anchor },
      nextCycleOpenDay,
    );

    expect(result.isOpen).toBe(true);
  });
});
