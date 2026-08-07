const DURATION_REGEX = /^(?<amount>\d+)(?<unit>ms|s|m|h|d)$/;

const UNIT_TO_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export const parseDurationMs = (value: string): number => {
  const match = DURATION_REGEX.exec(value.trim());
  const amount = match?.groups?.amount;
  const unit = match?.groups?.unit;

  if (!amount || !unit) {
    throw new Error(`Invalid duration format: "${value}". Expected e.g. "15m", "7d".`);
  }

  const unitMs = UNIT_TO_MS[unit];
  if (unitMs === undefined) {
    throw new Error(`Unsupported duration unit: "${unit}"`);
  }

  return Number(amount) * unitMs;
};
