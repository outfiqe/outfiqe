import { HTTP_STATUS } from "#constants/http.constants.js";
import type { SupportStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";

import { ALLOWED_SUPPORT_TRANSITIONS } from "./support.constants.js";
import { supportRepository } from "./support.repository.js";

export const ticketNotFound = (): AppError =>
  new AppError("SUPPORT_TICKET_NOT_FOUND", "Support request not found.", HTTP_STATUS.NOT_FOUND);

export const requireLegalTransition = (from: SupportStatus, to: SupportStatus): void => {
  if (!ALLOWED_SUPPORT_TRANSITIONS[from].includes(to)) {
    throw new AppError(
      "INVALID_SUPPORT_TRANSITION",
      `A ${from.toLowerCase()} request can't move to ${to.toLowerCase()}.`,
      HTTP_STATUS.CONFLICT,
    );
  }
};

export const moveStatusBestEffort = async (
  ticketId: string,
  from: SupportStatus,
  to: SupportStatus,
): Promise<void> => {
  if (from === to || !ALLOWED_SUPPORT_TRANSITIONS[from].includes(to)) return;
  await supportRepository.transitionStatus(ticketId, from, to);
};
