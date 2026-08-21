export const toDatetimeLocalValue = (iso: string | null): string => {
  if (!iso) return "";
  const instant = new Date(iso);
  const localOffsetMs = instant.getTimezoneOffset() * 60000;
  return new Date(instant.getTime() - localOffsetMs).toISOString().slice(0, 16);
};

export const toIsoOrNull = (datetimeLocalValue: string): string | null =>
  datetimeLocalValue ? new Date(datetimeLocalValue).toISOString() : null;
