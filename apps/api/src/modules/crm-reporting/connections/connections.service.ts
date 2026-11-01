import { HTTP_STATUS } from "#constants/http.constants.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { crmContactsRepository } from "#modules/crm-contacts/crm-contacts.repository.js";
import { crmPipelineRepository } from "#modules/crm-pipeline/crm-pipeline.repository.js";
import { crmRelationshipsService } from "#modules/crm-relationships/crm-relationships.service.js";
import { crmTicketsRepository } from "#modules/crm-tickets/crm-tickets.repository.js";
import { describeError } from "#redis/redis.utils.js";

import {
  CRM_SEARCH_ENTITY,
  CRM_SEARCH_ENTITY_PERMISSION,
  TASKS_READ_PERMISSION,
} from "../crm-reporting.constants.js";
import type { CrmConnectionsQuery } from "../crm-reporting.schemas.js";
import type { ConnectedPerson, CrmConnections } from "../crm-reporting.types.js";
import { crmConnectionsRepository, type LinkedRecords } from "./connections.repository.js";

type ConnectionsOrganization = { id: string; linkedBrandId: string | null };

type ConnectionsViewer = {
  isSuperAdmin: boolean;
  permissionKeys: string[];
};

const NO_LINKS = { userIds: [], dealId: null, contactId: null, ticketId: null };

const hasPermission = (viewer: ConnectionsViewer, permissionKey: string): boolean =>
  viewer.isSuperAdmin || viewer.permissionKeys.includes(permissionKey);

const toUserIds = (...userIds: (string | null)[]): string[] =>
  userIds.filter((userId) => userId !== null);

const requireRecord = <Row>(record: Row | null, label: string): Row => {
  if (!record) {
    throw new AppError(
      "SUBJECT_NOT_FOUND",
      `That ${label} isn't in this CRM.`,
      HTTP_STATUS.NOT_FOUND,
    );
  }
  return record;
};

const requirePersonInCrm = async (
  organization: ConnectionsOrganization,
  { subjectType, subjectId }: CrmConnectionsQuery,
): Promise<LinkedRecords> => {
  const isInCrm =
    subjectType === CRM_SEARCH_ENTITY.PARTNER
      ? await crmRelationshipsService.isPartner(organization, subjectId)
      : await crmRelationshipsService.isCustomer(organization, subjectId);
  requireRecord(isInCrm ? subjectId : null, subjectType);
  return { ...NO_LINKS, userIds: [subjectId] };
};

const loadSubjectLinks = async (
  organization: ConnectionsOrganization,
  subject: CrmConnectionsQuery,
): Promise<LinkedRecords> => {
  const { subjectType, subjectId } = subject;
  const { id: organizationId } = organization;

  if (subjectType === CRM_SEARCH_ENTITY.DEAL) {
    const deal = await crmPipelineRepository.findDeal(organizationId, subjectId);
    const { partnerCreatorId } = requireRecord(deal, "opportunity");
    return { ...NO_LINKS, userIds: [partnerCreatorId], dealId: subjectId };
  }
  if (subjectType === CRM_SEARCH_ENTITY.TICKET) {
    const ticket = await crmTicketsRepository.findTicket(organizationId, subjectId);
    const { partnerCreatorId, customerUserId } = requireRecord(ticket, "ticket");
    return {
      ...NO_LINKS,
      userIds: toUserIds(partnerCreatorId, customerUserId),
      ticketId: subjectId,
    };
  }
  if (subjectType === CRM_SEARCH_ENTITY.CONTACT) {
    const contact = await crmContactsRepository.findById(organizationId, subjectId);
    const { linkedUserId } = requireRecord(contact, "contact");
    return { ...NO_LINKS, userIds: toUserIds(linkedUserId), contactId: subjectId };
  }
  return requirePersonInCrm(organization, subject);
};

const loadPersonRoles = async (
  organization: ConnectionsOrganization,
  viewer: ConnectionsViewer,
  subject: CrmConnectionsQuery,
  userId: string,
): Promise<ConnectedPerson["role"][]> => {
  const canSeePartner =
    subject.subjectType !== CRM_SEARCH_ENTITY.PARTNER &&
    hasPermission(viewer, CRM_SEARCH_ENTITY_PERMISSION[CRM_SEARCH_ENTITY.PARTNER]);
  const canSeeCustomer =
    subject.subjectType !== CRM_SEARCH_ENTITY.CUSTOMER &&
    hasPermission(viewer, CRM_SEARCH_ENTITY_PERMISSION[CRM_SEARCH_ENTITY.CUSTOMER]);

  const [isPartner, isCustomer] = await Promise.all([
    canSeePartner ? crmRelationshipsService.isPartner(organization, userId) : false,
    canSeeCustomer ? crmRelationshipsService.isCustomer(organization, userId) : false,
  ]);
  return [...(isPartner ? ["partner" as const] : []), ...(isCustomer ? ["customer" as const] : [])];
};

const loadConnectedPeople = async (
  organization: ConnectionsOrganization,
  viewer: ConnectionsViewer,
  subject: CrmConnectionsQuery,
  { userIds }: LinkedRecords,
): Promise<ConnectedPerson[]> => {
  const people = await crmConnectionsRepository.findPeople(userIds);
  const peopleWithRoles = await Promise.all(
    people.map(async ({ id, name, handle, avatarUrl }) => {
      const roles = await loadPersonRoles(organization, viewer, subject, id);
      return roles.map((role) => ({ userId: id, name, handle, avatarUrl, role }));
    }),
  );
  return peopleWithRoles.flat();
};

const loadWhenAllowed = async <Row>(
  viewer: ConnectionsViewer,
  permissionKey: string,
  label: string,
  load: () => Promise<Row[]>,
): Promise<Row[] | null> => {
  if (!hasPermission(viewer, permissionKey)) return null;
  try {
    return await load();
  } catch (error) {
    logger.error(`Connected ${label} failed to load: ${describeError(error)}`);
    return [];
  }
};

export const crmConnectionsService = {
  async getConnections(
    organization: ConnectionsOrganization,
    viewer: ConnectionsViewer,
    subject: CrmConnectionsQuery,
  ): Promise<CrmConnections> {
    const subjectPermission = CRM_SEARCH_ENTITY_PERMISSION[subject.subjectType];
    if (!hasPermission(viewer, subjectPermission)) {
      throw new AppError(
        "FORBIDDEN",
        "You do not have permission to do this.",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    const { id: organizationId } = organization;
    const links = await loadSubjectLinks(organization, subject);
    const [people, contacts, deals, tickets, tasks] = await Promise.all([
      loadConnectedPeople(organization, viewer, subject, links),
      loadWhenAllowed(viewer, CRM_SEARCH_ENTITY_PERMISSION.contact, "contacts", () =>
        crmConnectionsRepository.listContacts(organizationId, links),
      ),
      loadWhenAllowed(viewer, CRM_SEARCH_ENTITY_PERMISSION.deal, "opportunities", () =>
        crmConnectionsRepository.listDeals(organizationId, links),
      ),
      loadWhenAllowed(viewer, CRM_SEARCH_ENTITY_PERMISSION.ticket, "tickets", () =>
        crmConnectionsRepository.listTickets(organizationId, links),
      ),
      loadWhenAllowed(viewer, TASKS_READ_PERMISSION, "tasks", () =>
        crmConnectionsRepository.listOpenTasks(organizationId, links),
      ),
    ]);

    return { people, contacts, deals, tickets, tasks };
  },
};
