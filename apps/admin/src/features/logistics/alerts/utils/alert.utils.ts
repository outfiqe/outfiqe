export const formatAlertTime = (isoDate: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(isoDate),
  );
