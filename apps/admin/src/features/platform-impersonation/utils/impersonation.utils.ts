export const formatMoment = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "—";
