import { applyCrmCounterDelta, touchCrmActivity } from "#lib/crm-counters.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { DEFAULT_CONTACTS_PAGE_SIZE } from "./crm-contacts.constants.js";
import { crmContactsRepository } from "./crm-contacts.repository.js";
import type {
  ContactListQuery,
  CreateContactBody,
  UpdateContactBody,
} from "./crm-contacts.schemas.js";
import type { ContactListPage, ContactWithRelations } from "./crm-contacts.types.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

const assertOwnerMembership = async (
  organizationId: string,
  ownerMembershipId: string | null | undefined,
): Promise<void> => {
  if (!ownerMembershipId) return;
  const membership = await crmContactsRepository.findMembership(organizationId, ownerMembershipId);
  if (!membership) {
    throw new AppError(
      "OWNER_NOT_FOUND",
      "The contact owner isn't a member of this organization.",
      NOT_FOUND_STATUS,
    );
  }
};

const assertLinkedUser = async (linkedUserId: string | null | undefined): Promise<void> => {
  if (!linkedUserId) return;
  const exists = await crmContactsRepository.userExists(linkedUserId);
  if (!exists) {
    throw new AppError(
      "LINKED_USER_NOT_FOUND",
      "The linked account doesn't exist.",
      NOT_FOUND_STATUS,
    );
  }
};

const asEmailConflict = (error: unknown): unknown =>
  isUniqueConstraintError(error)
    ? new AppError(
        "CONTACT_EMAIL_TAKEN",
        "A contact with that email already exists in this organization.",
        CONFLICT_STATUS,
      )
    : error;

export const crmContactsService = {
  listContacts(organizationId: string, query: ContactListQuery): Promise<ContactListPage> {
    return crmContactsRepository.list(organizationId, {
      q: query.q,
      lifecycleStage: query.lifecycleStage,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? DEFAULT_CONTACTS_PAGE_SIZE,
    });
  },

  async getContact(organizationId: string, contactId: string): Promise<ContactWithRelations> {
    const contact = await crmContactsRepository.findById(organizationId, contactId);
    if (!contact) throw new AppError("CONTACT_NOT_FOUND", "Contact not found.", NOT_FOUND_STATUS);
    return contact;
  },

  async createContact(
    organizationId: string,
    body: CreateContactBody,
  ): Promise<ContactWithRelations> {
    await assertOwnerMembership(organizationId, body.ownerMembershipId);
    await assertLinkedUser(body.linkedUserId);

    let contact: ContactWithRelations;
    try {
      contact = await crmContactsRepository.create({ organizationId, ...body });
    } catch (error) {
      throw asEmailConflict(error);
    }
    await applyCrmCounterDelta(organizationId, "contactCount", 1);
    return contact;
  },

  async updateContact(
    organizationId: string,
    contactId: string,
    body: UpdateContactBody,
  ): Promise<ContactWithRelations> {
    await this.getContact(organizationId, contactId);
    await assertOwnerMembership(organizationId, body.ownerMembershipId);
    await assertLinkedUser(body.linkedUserId);

    let contact: ContactWithRelations;
    try {
      contact = await crmContactsRepository.update(organizationId, contactId, body);
    } catch (error) {
      throw asEmailConflict(error);
    }
    await touchCrmActivity(organizationId);
    return contact;
  },

  async deleteContact(organizationId: string, contactId: string): Promise<void> {
    await this.getContact(organizationId, contactId);
    await crmContactsRepository.delete(organizationId, contactId);
    await applyCrmCounterDelta(organizationId, "contactCount", -1, { touchLastActivity: false });
  },
};
