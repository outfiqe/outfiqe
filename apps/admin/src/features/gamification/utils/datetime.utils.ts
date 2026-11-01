import { toDateTimeInputValue } from "@outfiqe/utils";

export const toDatetimeLocalValue = (iso: string | null): string =>
  iso ? toDateTimeInputValue(new Date(iso)) : "";

export const toIsoOrNull = (datetimeLocalValue: string): string | null =>
  datetimeLocalValue ? new Date(datetimeLocalValue).toISOString() : null;
