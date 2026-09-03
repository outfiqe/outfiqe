import { env } from "#config/env.config.js";
import {
  supportRequestReceivedTemplate,
  supportResolvedTemplate,
  supportStaffReplyTemplate,
} from "#email-templates/templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import {
  CreatorStatus,
  SupportAuthorKind,
  type SupportPriority,
  SupportSegment,
  SupportStatus,
  SupportVisibility,
  UserRole,
} from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";

import {
  ALLOWED_SUPPORT_TRANSITIONS,
  formatReference,
  REOPEN_TOKEN_TTL_MS,
  REOPENABLE_STATUSES,
} from "./support.constants.js";
import { supportRepository } from "./support.repository.js";
import type {
  AdminChangeStatusBody,
  AdminListQuery,
  AdminReplyBody,
  CreateSupportTicketBody,
  MineListQuery,
} from "./support.schemas.js";
import type {
  SupportInboxStats,
  SupportRequesterIdentity,
  SupportTicketPage,
  SupportTicketWithThread,
} from "./support.types.js";

const NOT_FOUND_STATUS = 404;
const BAD_REQUEST_STATUS = 400;
const FORBIDDEN_STATUS = 403;
const CONFLICT_STATUS = 409;

type RequestContext = { sourceIp: string | null; userAgent: string | null };

const ticketNotFound = (): AppError =>
  new AppError("SUPPORT_TICKET_NOT_FOUND", "Support request not found.", NOT_FOUND_STATUS);

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

const threadUrl = (ticketId: string): string =>
  `${env.FRONTEND_URL}/settings/support?ticket=${ticketId}`;

const requireLegalTransition = (from: SupportStatus, to: SupportStatus): void => {
  if (!ALLOWED_SUPPORT_TRANSITIONS[from].includes(to)) {
    throw new AppError(
      "INVALID_SUPPORT_TRANSITION",
      `A ${from.toLowerCase()} request can't move to ${to.toLowerCase()}.`,
      CONFLICT_STATUS,
    );
  }
};

const moveStatusBestEffort = async (
  ticketId: string,
  from: SupportStatus,
  to: SupportStatus,
): Promise<void> => {
  if (from === to || !ALLOWED_SUPPORT_TRANSITIONS[from].includes(to)) return;
  await supportRepository.transitionStatus(ticketId, from, to);
};

export const supportService = {
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
          BAD_REQUEST_STATUS,
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
        NOT_FOUND_STATUS,
      );
    if (!REOPENABLE_STATUSES.includes(found.status)) {
      throw new AppError(
        "SUPPORT_REOPEN_INVALID",
        "This request has already been reopened.",
        CONFLICT_STATUS,
      );
    }

    await supportRepository.transitionStatus(found.id, found.status, SupportStatus.OPEN);
    await supportRepository.setReopenToken(found.id, null);

    const ticket = await supportRepository.findForAdmin(found.id);
    return { reference: ticket ? ticket.reference : formatReference(0) };
  },

  listForAdmin(query: AdminListQuery): Promise<SupportTicketPage> {
    return supportRepository.listForAdmin(
      {
        status: query.status,
        category: query.category,
        segment: query.segment,
        assigneeUserId: query.assigneeUserId,
        unassigned: query.unassigned,
        search: query.search,
      },
      { cursor: query.cursor, limit: query.limit },
    );
  },

  async getForAdmin(ticketId: string): Promise<SupportTicketWithThread> {
    const ticket = await supportRepository.findForAdmin(ticketId);
    if (!ticket) throw ticketNotFound();
    return ticket;
  },

  async adminReply(
    actorUserId: string,
    ticketId: string,
    body: AdminReplyBody,
  ): Promise<SupportTicketWithThread> {
    const ticket = await this.getForAdmin(ticketId);

    await supportRepository.addMessage({
      ticketId,
      authorKind: SupportAuthorKind.STAFF,
      authorUserId: actorUserId,
      visibility: body.visibility,
      body: body.body,
      attachmentUrls: body.attachmentUrls,
    });

    if (ticket.status === SupportStatus.NEW) {
      await moveStatusBestEffort(ticketId, SupportStatus.NEW, SupportStatus.OPEN);
    }

    if (body.visibility === SupportVisibility.PUBLIC) {
      await supportRepository.stampFirstResponded(ticketId);

      if (body.moveToWaitingOnCustomer) {
        const current = ticket.status === SupportStatus.NEW ? SupportStatus.OPEN : ticket.status;
        await moveStatusBestEffort(ticketId, current, SupportStatus.WAITING_ON_CUSTOMER);
      }

      await eventBus.publish(DomainEvents.SUPPORT_TICKET_STAFF_REPLIED, {
        ticketId,
        subject: ticket.subject,
        requesterUserId: ticket.requesterUserId,
      });

      await sendEmail({
        to: ticket.requesterEmail,
        ...supportStaffReplyTemplate({
          reference: ticket.reference,
          subject: ticket.subject,
          reply: body.body,
          threadUrl: threadUrl(ticketId),
        }),
        body: body.body,
      });
    }

    return this.getForAdmin(ticketId);
  },

  async changeStatus(
    ticketId: string,
    input: AdminChangeStatusBody,
  ): Promise<SupportTicketWithThread> {
    const ticket = await this.getForAdmin(ticketId);

    if (ticket.status !== input.expectedStatus) {
      throw new AppError(
        "SUPPORT_STATUS_CHANGED",
        "This request's status changed under you — reload and try again.",
        CONFLICT_STATUS,
      );
    }
    if (input.status === ticket.status) return ticket;

    requireLegalTransition(ticket.status, input.status);

    const moved = await supportRepository.transitionStatus(ticketId, ticket.status, input.status);
    if (!moved) {
      throw new AppError(
        "SUPPORT_STATUS_CHANGED",
        "This request's status changed under you — reload and try again.",
        CONFLICT_STATUS,
      );
    }

    if (input.status === SupportStatus.RESOLVED) {
      const reopenToken = generateOpaqueToken();
      await supportRepository.setReopenToken(ticketId, hashToken(reopenToken));

      await eventBus.publish(DomainEvents.SUPPORT_TICKET_RESOLVED, {
        ticketId,
        subject: ticket.subject,
        requesterUserId: ticket.requesterUserId,
      });

      await sendEmail({
        to: ticket.requesterEmail,
        ...supportResolvedTemplate({
          reference: ticket.reference,
          subject: ticket.subject,
          reopenUrl: `${env.FRONTEND_URL}/support/reopen?token=${reopenToken}`,
        }),
        body: `We've marked ${ticket.reference} resolved. Reopen it within ${Math.round(
          REOPEN_TOKEN_TTL_MS / (24 * 60 * 60 * 1000),
        )} days if it didn't help.`,
      });
    }

    if (input.status === SupportStatus.OPEN) {
      await supportRepository.setReopenToken(ticketId, null);
    }

    return this.getForAdmin(ticketId);
  },

  async assign(
    actorUserId: string,
    ticketId: string,
    assigneeUserId: string | null,
    canManageOthers: boolean,
  ): Promise<SupportTicketWithThread> {
    const ticket = await this.getForAdmin(ticketId);

    if (assigneeUserId && assigneeUserId !== actorUserId && !canManageOthers) {
      throw new AppError(
        "FORBIDDEN",
        "You can only assign support requests to yourself.",
        FORBIDDEN_STATUS,
      );
    }

    if (assigneeUserId) {
      const assignee = await userRepository.findById(assigneeUserId);
      if (!assignee || assignee.role !== UserRole.ADMIN) {
        throw new AppError(
          "SUPPORT_ASSIGNEE_INVALID",
          "That account can't be assigned support requests.",
          BAD_REQUEST_STATUS,
        );
      }
    }

    await supportRepository.assign(ticketId, assigneeUserId);

    if (assigneeUserId && ticket.status === SupportStatus.NEW) {
      await moveStatusBestEffort(ticketId, SupportStatus.NEW, SupportStatus.OPEN);
    }

    if (assigneeUserId && assigneeUserId !== actorUserId) {
      await eventBus.publish(DomainEvents.SUPPORT_TICKET_ASSIGNED, {
        ticketId,
        subject: ticket.subject,
        assigneeUserId,
        assignedByUserId: actorUserId,
      });
    }

    return this.getForAdmin(ticketId);
  },

  async setPriority(ticketId: string, priority: SupportPriority): Promise<SupportTicketWithThread> {
    await this.getForAdmin(ticketId);
    await supportRepository.setPriority(ticketId, priority);
    return this.getForAdmin(ticketId);
  },

  stats(): Promise<SupportInboxStats> {
    return supportRepository.inboxStats();
  },

  listAgents(): Promise<{ userId: string; name: string }[]> {
    return supportRepository.listAgents();
  },
};
