export const THRIFT_CONDITION_VALUES = ["LIKE_NEW", "GOOD", "FAIR"] as const;

export type ThriftCondition = (typeof THRIFT_CONDITION_VALUES)[number];

export const THRIFT_CONDITION = {
  LIKE_NEW: "LIKE_NEW",
  GOOD: "GOOD",
  FAIR: "FAIR",
} as const satisfies Record<string, ThriftCondition>;

export const THRIFT_CONDITION_LABEL: Record<ThriftCondition, string> = {
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
};
