const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID_PATTERN.test(value);

const SHORT_UUID_PATTERN = /^[0-9a-f]{4,8}$/i;
const SHORT_UUID_LENGTH = 8;
const LOWEST_UUID_TAIL = "-0000-0000-0000-000000000000";
const HIGHEST_UUID_TAIL = "-ffff-ffff-ffff-ffffffffffff";

export const toUuidPrefixRange = (shortId: string): { gte: string; lte: string } | null => {
  if (!SHORT_UUID_PATTERN.test(shortId)) return null;
  const lowerCaseId = shortId.toLowerCase();
  return {
    gte: `${lowerCaseId.padEnd(SHORT_UUID_LENGTH, "0")}${LOWEST_UUID_TAIL}`,
    lte: `${lowerCaseId.padEnd(SHORT_UUID_LENGTH, "f")}${HIGHEST_UUID_TAIL}`,
  };
};
