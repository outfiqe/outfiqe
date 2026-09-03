import { SupportStatus } from "#generated/prisma/enums.js";

export const REFERENCE_PREFIX = "OFQ";

const REFERENCE_PATTERN = new RegExp(`^\\s*(?:${REFERENCE_PREFIX}[-\\s]?)?(\\d+)\\s*$`, "i");

export const formatReference = (ticketNumber: number): string =>
  `${REFERENCE_PREFIX}-${ticketNumber}`;

export const parseReference = (raw: string): number | null => {
  const match = REFERENCE_PATTERN.exec(raw);
  if (!match?.[1]) return null;
  const ticketNumber = Number(match[1]);
  return Number.isSafeInteger(ticketNumber) && ticketNumber > 0 ? ticketNumber : null;
};

export const ALLOWED_SUPPORT_TRANSITIONS: Record<SupportStatus, SupportStatus[]> = {
  [SupportStatus.NEW]: [SupportStatus.OPEN, SupportStatus.CLOSED],
  [SupportStatus.OPEN]: [SupportStatus.WAITING_ON_CUSTOMER, SupportStatus.RESOLVED],
  [SupportStatus.WAITING_ON_CUSTOMER]: [SupportStatus.OPEN, SupportStatus.RESOLVED],
  [SupportStatus.RESOLVED]: [SupportStatus.OPEN, SupportStatus.CLOSED],
  [SupportStatus.CLOSED]: [SupportStatus.OPEN],
};

export const RESOLVED_STATUSES: SupportStatus[] = [SupportStatus.RESOLVED, SupportStatus.CLOSED];

export const REOPENABLE_STATUSES: SupportStatus[] = [SupportStatus.RESOLVED, SupportStatus.CLOSED];

export const AWAITING_STAFF_STATUSES: SupportStatus[] = [SupportStatus.NEW, SupportStatus.OPEN];

export const DEFAULT_SUPPORT_PAGE_SIZE = 25;
export const MAX_SUPPORT_PAGE_SIZE = 100;

export const REOPEN_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const RESOLVED_TICKET_AUTO_CLOSE_MS = 14 * 24 * 60 * 60 * 1000;

export const SUPPORT_TICKET_CREATE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_SUPPORT_TICKETS_PER_WINDOW = 5;
export const SUPPORT_REPLY_WINDOW_MS = 60 * 60 * 1000;
export const MAX_SUPPORT_REPLIES_PER_WINDOW = 30;

export const SUBJECT_MAX_LENGTH = 140;
export const MESSAGE_MIN_LENGTH = 20;
export const MESSAGE_MAX_LENGTH = 8000;
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

export const SUPPORT_AUTO_CLOSE_JOB_INTERVAL_MS = 60 * 60 * 1000;

export const SUPPORT_PERMISSION = {
  READ: "platform:support:read",
  RESPOND: "platform:support:respond",
  MANAGE: "platform:support:manage",
} as const;
