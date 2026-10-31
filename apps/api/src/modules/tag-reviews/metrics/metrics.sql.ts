import { secondsInHour } from "date-fns/constants";

import { Prisma } from "#generated/prisma/client.js";

const TENTHS_PER_UNIT = 10;

export const TREND_WINDOW_DAYS = 7;
export const STUCK_TAG_AGE_DAYS = 7;

export const TAG_APPROVED_AT_SQL = Prisma.sql`COALESCE(clp.reviewed_at, clp.submitted_at)`;

export const LOOK_IS_LIVE_SQL = Prisma.sql`cl.deleted_at IS NULL`;

export const roundToOneDecimal = (amount: number): number =>
  Math.round(amount * TENTHS_PER_UNIT) / TENTHS_PER_UNIT;

export const secondsToHours = (seconds: number): number =>
  roundToOneDecimal(Number(seconds) / secondsInHour);
