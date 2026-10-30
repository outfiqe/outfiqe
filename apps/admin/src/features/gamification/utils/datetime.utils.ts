import { MS_PER_MINUTE } from "@outfiqe/utils";

import { DATETIME_LOCAL_LENGTH } from "@/lib/dateInputs";

export const toDatetimeLocalValue = (iso: string | null): string => {
  if (!iso) return "";
  const instant = new Date(iso);
  const localOffsetMs = instant.getTimezoneOffset() * MS_PER_MINUTE;
  return new Date(instant.getTime() - localOffsetMs).toISOString().slice(0, DATETIME_LOCAL_LENGTH);
};

export const toIsoOrNull = (datetimeLocalValue: string): string | null =>
  datetimeLocalValue ? new Date(datetimeLocalValue).toISOString() : null;
