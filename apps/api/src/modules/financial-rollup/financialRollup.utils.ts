export const sumStatusBuckets = <Status extends string>(
  amountByStatus: Partial<Record<Status, number>>,
  statuses: readonly Status[],
): number => statuses.reduce((total, status) => total + (amountByStatus[status] ?? 0), 0);
