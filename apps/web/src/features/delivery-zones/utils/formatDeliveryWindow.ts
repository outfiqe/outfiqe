import type { DeliveryEstimate } from "../api/deliveryZoneSchemas";

const calendarDayFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const formatCalendarDate = (calendarDate: string): string =>
  calendarDayFormatter.format(new Date(`${calendarDate}T00:00:00.000Z`));

export const formatDeliveryWindow = ({ earliestDate, latestDate }: DeliveryEstimate): string =>
  earliestDate === latestDate
    ? formatCalendarDate(earliestDate)
    : `${formatCalendarDate(earliestDate)} – ${formatCalendarDate(latestDate)}`;
