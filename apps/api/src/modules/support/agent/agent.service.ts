import { env } from "#config/env.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import {
  supportResolvedTemplate,
  supportStaffReplyTemplate,
} from "#email-templates/support.templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import {
  SupportAuthorKind,
  type SupportPriority,
  SupportStatus,
  SupportVisibility,
  UserRole,
} from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { SUPPORT_AGENT_PERMISSION_KEYS } from "#modules/platform-access/platform-access.constants.js";
import { platformAccessService } from "#modules/platform-access/platform-access.service.js";
import { userRepository } from "#modules/users/user.repository.js";

import { REOPEN_TOKEN_TTL_MS } from "../support.constants.js";
import { moveStatusBestEffort, requireLegalTransition, ticketNotFound } from "../support.guards.js";
import { supportRepository } from "../support.repository.js";
import type { AdminChangeStatusBody, AdminListQuery, AdminReplyBody } from "../support.schemas.js";
import type {
  SupportInboxStats,
  SupportTicketPage,
  SupportTicketWithThread,
} from "../support.types.js";

const threadUrl = (ticketId: string): string =>
  `${env.FRONTEND_URL}/settings/support?ticket=${ticketId}`;

export const supportAgentService = {
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
        HTTP_STATUS.CONFLICT,
      );
    }
    if (input.status === ticket.status) return ticket;

    requireLegalTransition(ticket.status, input.status);

    const moved = await supportRepository.transitionStatus(ticketId, ticket.status, input.status);
    if (!moved) {
      throw new AppError(
        "SUPPORT_STATUS_CHANGED",
        "This request's status changed under you — reload and try again.",
        HTTP_STATUS.CONFLICT,
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
    expectedAssigneeUserId: string | null,
    canManageOthers: boolean,
  ): Promise<SupportTicketWithThread> {
    const ticket = await this.getForAdmin(ticketId);

    if (ticket.assigneeUserId !== expectedAssigneeUserId) {
      throw new AppError(
        "SUPPORT_ASSIGNEE_CHANGED",
        "This request's assignee changed under you — reload and try again.",
        HTTP_STATUS.CONFLICT,
      );
    }

    if (assigneeUserId && assigneeUserId !== actorUserId && !canManageOthers) {
      throw new AppError(
        "FORBIDDEN",
        "You can only assign support requests to yourself.",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    if (assigneeUserId) {
      const assignee = await userRepository.findById(assigneeUserId);
      const assigneeAccess = assignee
        ? await platformAccessService.resolveAccess(assigneeUserId)
        : null;
      const assigneeIsSupportAgent =
        assignee?.role === UserRole.ADMIN &&
        SUPPORT_AGENT_PERMISSION_KEYS.some((key) => assigneeAccess?.permissionKeys.includes(key));
      if (!assigneeIsSupportAgent) {
        throw new AppError(
          "SUPPORT_ASSIGNEE_INVALID",
          "That account can't be assigned support requests.",
          HTTP_STATUS.BAD_REQUEST,
        );
      }
    }

    const claimed = await supportRepository.assign(
      ticketId,
      expectedAssigneeUserId,
      assigneeUserId,
    );
    if (!claimed) {
      throw new AppError(
        "SUPPORT_ASSIGNEE_CHANGED",
        "This request's assignee changed under you — reload and try again.",
        HTTP_STATUS.CONFLICT,
      );
    }

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

  async setPriority(
    ticketId: string,
    priority: SupportPriority,
    expectedPriority: SupportPriority,
  ): Promise<SupportTicketWithThread> {
    const ticket = await this.getForAdmin(ticketId);

    if (ticket.priority !== expectedPriority) {
      throw new AppError(
        "SUPPORT_PRIORITY_CHANGED",
        "This request's priority changed under you — reload and try again.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const claimed = await supportRepository.setPriority(ticketId, expectedPriority, priority);
    if (!claimed) {
      throw new AppError(
        "SUPPORT_PRIORITY_CHANGED",
        "This request's priority changed under you — reload and try again.",
        HTTP_STATUS.CONFLICT,
      );
    }

    return this.getForAdmin(ticketId);
  },

  stats(): Promise<SupportInboxStats> {
    return supportRepository.inboxStats();
  },

  async listAgents(): Promise<{ userId: string; name: string }[]> {
    const agentUserIds = await platformAccessService.findUserIdsHoldingAnyPermission(
      SUPPORT_AGENT_PERMISSION_KEYS,
    );
    return supportRepository.listAgents(agentUserIds);
  },
};
