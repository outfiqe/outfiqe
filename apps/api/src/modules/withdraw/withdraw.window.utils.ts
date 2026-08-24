import { addDays } from "date-fns/addDays";
import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import { endOfMonth } from "date-fns/endOfMonth";
import { startOfDay } from "date-fns/startOfDay";

import { WithdrawWindowType } from "#generated/prisma/enums.js";
import { nextIsoWeekStart } from "#lib/iso-week.utils.js";

const CUSTOM_DAYS_WINDOW_OPEN_DURATION_DAYS = 1;

export type WithdrawWindowBounds = {
  isOpen: boolean;
  windowStart: Date;
  nextWindowOpensAt: Date;
};

type WithdrawWindowPolicy = {
  windowType: WithdrawWindowType;
  windowValue: number;
  createdAt: Date;
};

const computeMonthlyWindow = (now: Date, windowValueDays: number): WithdrawWindowBounds => {
  const monthEnd = endOfMonth(now);
  const windowStart = startOfDay(addDays(monthEnd, -windowValueDays));
  const isOpen = now >= windowStart;

  return { isOpen, windowStart, nextWindowOpensAt: windowStart };
};

const computeWeeklyWindow = (now: Date, windowValueDays: number): WithdrawWindowBounds => {
  const weekEnd = nextIsoWeekStart(now);
  const windowStart = startOfDay(addDays(weekEnd, -windowValueDays));
  const isOpen = now >= windowStart;

  return { isOpen, windowStart, nextWindowOpensAt: windowStart };
};

const computeCustomDaysWindow = (
  now: Date,
  windowValueDays: number,
  anchor: Date,
): WithdrawWindowBounds => {
  const daysSinceAnchor = differenceInCalendarDays(startOfDay(now), startOfDay(anchor));
  const cycleIndex = Math.floor(daysSinceAnchor / windowValueDays);
  const currentCycleStart = addDays(startOfDay(anchor), cycleIndex * windowValueDays);
  const currentCycleEnd = addDays(currentCycleStart, CUSTOM_DAYS_WINDOW_OPEN_DURATION_DAYS);
  const isOpen = now >= currentCycleStart && now < currentCycleEnd;

  return {
    isOpen,
    windowStart: currentCycleStart,
    nextWindowOpensAt: isOpen ? currentCycleStart : addDays(currentCycleStart, windowValueDays),
  };
};

export const computeWithdrawWindow = (
  policy: WithdrawWindowPolicy,
  now: Date = new Date(),
): WithdrawWindowBounds => {
  switch (policy.windowType) {
    case WithdrawWindowType.MONTHLY:
      return computeMonthlyWindow(now, policy.windowValue);
    case WithdrawWindowType.WEEKLY:
      return computeWeeklyWindow(now, policy.windowValue);
    case WithdrawWindowType.CUSTOM_DAYS:
      return computeCustomDaysWindow(now, policy.windowValue, policy.createdAt);
    default:
      policy.windowType satisfies never;
      throw new Error(`Unhandled withdraw window type: ${String(policy.windowType)}`);
  }
};
