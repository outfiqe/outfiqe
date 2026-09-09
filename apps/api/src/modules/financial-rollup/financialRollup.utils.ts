export const sumStatusBuckets = (
  amountByStatus: Partial<Record<string, number>>,
  statuses: readonly string[],
): number => statuses.reduce((total, status) => total + (amountByStatus[status] ?? 0), 0);
