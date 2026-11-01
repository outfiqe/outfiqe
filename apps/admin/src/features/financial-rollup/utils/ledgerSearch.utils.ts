type LedgerSearch = {
  range?: string;
  method?: string;
  payout?: string;
  commission?: string;
  focus?: string;
  from?: string;
  to?: string;
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const toLedgerSearch = (search: Record<string, unknown>): LedgerSearch => ({
  range: asString(search.range),
  method: asString(search.method),
  payout: asString(search.payout),
  commission: asString(search.commission),
  focus: asString(search.focus),
  from: asString(search.from),
  to: asString(search.to),
});
