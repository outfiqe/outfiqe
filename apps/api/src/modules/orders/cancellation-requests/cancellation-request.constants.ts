import { FulfilmentStatus } from "#generated/prisma/enums.js";

export const CLOSED_GROUP_STATUSES = [
  FulfilmentStatus.CANCELLED,
  FulfilmentStatus.DELIVERED,
  FulfilmentStatus.RETURNED,
];

export const CANCELLATION_REQUEST_PAGE_SIZE = { default: 20, max: 50 } as const;

export const CANCELLATION_DECISION = { APPROVED: "APPROVED", REJECTED: "REJECTED" } as const;
