import { toDateInputValue } from "@outfiqe/utils";

import { oneOfFilter, rawTextFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { toDayRange } from "../../activities/utils/taskDue.utils";

export const REPORT_RANGES = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "custom", label: "Pick dates", days: null },
] as const;

type ReportRange = (typeof REPORT_RANGES)[number]["value"];

const DEFAULT_REPORT_RANGE: ReportRange = "30d";
const REPORT_RANGE_FILTER = oneOfFilter<ReportRange>(
  REPORT_RANGES.map(({ value }) => value),
  DEFAULT_REPORT_RANGE,
);
const TODAY_COUNTS_AS_ONE_DAY = 1;

const toPresetDates = (days: number, now: Date) => {
  const firstDay = new Date(now);
  firstDay.setDate(firstDay.getDate() - days + TODAY_COUNTS_AS_ONE_DAY);
  return { dateFrom: toDateInputValue(firstDay), dateTo: toDateInputValue(now) };
};

export const useReportPeriod = () => {
  const [range, setRange] = useSearchFilter("range", REPORT_RANGE_FILTER);
  const [customFrom, setCustomFrom] = useSearchFilter("from", rawTextFilter);
  const [customTo, setCustomTo] = useSearchFilter("to", rawTextFilter);

  const presetDays = REPORT_RANGES.find(({ value }) => value === range)?.days;
  const { dateFrom, dateTo } = presetDays
    ? toPresetDates(presetDays, new Date())
    : { dateFrom: customFrom, dateTo: customTo };

  const from = toDayRange(dateFrom, "start");
  const to = toDayRange(dateTo, "end");

  return {
    range,
    setRange,
    customFrom,
    customTo,
    setCustomFrom,
    setCustomTo,
    dateFrom,
    dateTo,
    period: from && to ? { from, to } : null,
  };
};
