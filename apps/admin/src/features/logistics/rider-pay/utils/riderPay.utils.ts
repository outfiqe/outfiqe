export const formatPayAmount = (amount: number) => `Rs. ${amount.toLocaleString()}`;

export const formatPayDate = (isoDate: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(isoDate),
  );
