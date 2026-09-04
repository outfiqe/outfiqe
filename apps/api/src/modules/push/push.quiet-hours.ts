import {
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  NEPAL_UTC_OFFSET_MINUTES,
  QUIET_HOURS_END_HOUR,
  QUIET_HOURS_START_HOUR,
} from "./push.constants.js";

const nepalHourAt = (moment: Date): number => {
  const minutesSinceUtcMidnight = moment.getUTCHours() * MINUTES_PER_HOUR + moment.getUTCMinutes();
  const nepalMinutes = (minutesSinceUtcMidnight + NEPAL_UTC_OFFSET_MINUTES) % MINUTES_PER_DAY;
  return Math.floor(nepalMinutes / MINUTES_PER_HOUR);
};

export const isWithinQuietHours = (moment: Date): boolean => {
  const hour = nepalHourAt(moment);
  return hour >= QUIET_HOURS_START_HOUR || hour < QUIET_HOURS_END_HOUR;
};
