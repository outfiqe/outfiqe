import { HTTP_STATUS } from "#constants/http.constants.js";
import { supportRequestReceivedTemplate } from "#email-templates/support.templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import {
  CreatorStatus,
  SupportAuthorKind,
  SupportSegment,
  SupportStatus,
  SupportVisibility,
  UserRole,
} from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { hashToken } from "#lib/opaque-token.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";

import { formatReference, REOPENABLE_STATUSES } from "../support.constants.js";
import { moveStatusBestEffort, ticketNotFound } from "../support.guards.js";
import { supportRepository } from "../support.repository.js";
import type { CreateSupportTicketBody, MineListQuery } from "../support.schemas.js";
import type {
  SupportRequesterIdentity,
  SupportTicketPage,
  SupportTicketWithThread,
} from "../support.types.js";

type RequestContext = { sourceIp: string | null; userAgent: string | null };

const resolveSegment = (user: {
  role: UserRole;
  isCreator: boolean;
  creatorStatus: CreatorStatus;
}): SupportSegment => {
  if (user.role === UserRole.BRAND_OWNER) return SupportSegment.BRAND;
  if (user.isCreator && user.creatorStatus === CreatorStatus.APPROVED)
    return SupportSegment.CREATOR;
  return SupportSegment.SHOPPER;
};

const resolveRequesterIdentity = async (userId: string): Promise<SupportRequesterIdentity> => {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError("UNAUTHORIZED", "Sign in to raise a request.", 401);

  const segment = resolveSegment(user);
  const relatedBrandId =
    segment === SupportSegment.BRAND ? await supportRepository.findRequesterBrandId(userId) : null;

  return { userId, email: user.email, name: user.name, segment, relatedBrandId };
};

export const supportRequesterService = {
  async createTicket(
    requesterUserId: string,
    body: CreateSupportTicketBody,
    context: RequestContext,
  ): Promise<SupportTicketWithThread> {
    const requester = await resolveRequesterIdentity(requesterUserId);

    if (body.relatedOrderId) {
      const owned = await supportRepository.orderBelongsToUser(
        body.relatedOrderId,
        requesterUserId,
      );
      if (!owned) {
        throw new AppError(
          "ORDER_NOT_FOUND",
          "That order isn't on your account.",
          HTTP_STATUS.BAD_REQUEST,
        );
      }
    }

    const ticket = await supportRepository.create({
      requester,
      category: body.category,
      subject: body.subject,
      message: body.message,
      attachmentUrls: body.attachmentUrls,
      relatedOrderId: body.relatedOrderId,
      sourceIp: context.sourceIp,
      userAgent: context.userAgent,
    });

    await eventBus.publish(DomainEvents.SUPPORT_TICKET_CREATED, {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      category: ticket.category,
    });

    await sendEmail({
      to: ticket.requesterEmail,
      ...supportRequestReceivedTemplate({
        reference: ticket.reference,
        subject: ticket.subject,
        message: body.message,
      }),
      body: `We've received your support request ${ticket.reference}. We'll reply by email.`,
    });

    return ticket;
  },

  listMine(requesterUserId: string, query: MineListQuery): Promise<SupportTicketPage> {
    return supportRepository.listForRequester(requesterUserId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  },

  async getMine(requesterUserId: string, ticketId: string): Promise<SupportTicketWithThread> {
    const ticket = await supportRepository.findForRequester(ticketId, requesterUserId);
    if (!ticket) throw ticketNotFound();
    return ticket;
  },

  async requesterReply(
    requesterUserId: string,
    ticketId: string,
    body: string,
    attachmentUrls: string[],
  ): Promise<SupportTicketWithThread> {
    const ticket = await supportRepository.findForRequester(ticketId, requesterUserId);
    if (!ticket) throw ticketNotFound();

    await supportRepository.addMessage({
      ticketId,
      authorKind: SupportAuthorKind.REQUESTER,
      authorUserId: requesterUserId,
      visibility: SupportVisibility.PUBLIC,
      body,
      attachmentUrls,
    });
    await supportRepository.touchCustomerActivity(ticketId);
    await moveStatusBestEffort(ticketId, ticket.status, SupportStatus.OPEN);

    await eventBus.publish(DomainEvents.SUPPORT_TICKET_CUSTOMER_REPLIED, {
      ticketId,
      subject: ticket.subject,
      assigneeUserId: ticket.assigneeUserId,
    });

    return this.getMine(requesterUserId, ticketId);
  },

  async reopenByToken(rawToken: string): Promise<{ reference: string }> {
    const found = await supportRepository.findByReopenToken(hashToken(rawToken));
    if (!found)
      throw new AppError(
        "SUPPORT_REOPEN_INVALID",
        "This reopen link is no longer valid.",
        HTTP_STATUS.NOT_FOUND,
      );
    if (!REOPENABLE_STATUSES.includes(found.status)) {
      throw new AppError(
        "SUPPORT_REOPEN_INVALID",
        "This request has already been reopened.",
        HTTP_STATUS.CONFLICT,
      );
    }

    await supportRepository.transitionStatus(found.id, found.status, SupportStatus.OPEN);
    await supportRepository.setReopenToken(found.id, null);

    const ticket = await supportRepository.findForAdmin(found.id);
    return { reference: ticket ? ticket.reference : formatReference(0) };
  },
};
