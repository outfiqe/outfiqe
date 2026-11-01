import { HTTP_STATUS } from "#constants/http.constants.js";
import { applyCrmCounterDelta, touchCrmActivity } from "#lib/crm-counters.js";
import { toCsv } from "#lib/csv-writer.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { DEFAULT_CONTACTS_PAGE_SIZE, MAX_CONTACT_EXPORT_ROWS } from "./crm-contacts.constants.js";
import { crmContactsRepository } from "./crm-contacts.repository.js";
import type {
  ContactExportQuery,
  ContactListQuery,
  CreateContactBody,
  UpdateContactBody,
} from "./crm-contacts.schemas.js";
import type { ContactListPage, ContactWithRelations } from "./crm-contacts.types.js";

const NEXT_ROW = 1;
const CONTACT_EXPORT_HEADERS = [
  "Name",
  "Email",
  "Phone",
  "Company",
  "Job title",
  "Stage",
  "Source",
  "Tags",
  "Looked after by",
  "Added",
];

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
      HTTP_STATUS.NOT_FOUND,
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
      HTTP_STATUS.NOT_FOUND,
    );
  }
};

const asEmailConflict = (error: unknown): unknown =>
  isUniqueConstraintError(error)
    ? new AppError(
        "CONTACT_EMAIL_TAKEN",
        "A contact with that email already exists in this organization.",
        HTTP_STATUS.CONFLICT,
      )
    : error;

export const crmContactsService = {
  listContacts(organizationId: string, query: ContactListQuery): Promise<ContactListPage> {
    return crmContactsRepository.list(organizationId, {
      q: query.q,
      lifecycleStage: query.lifecycleStage,
      ownerMembershipId: query.ownerMembershipId,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? DEFAULT_CONTACTS_PAGE_SIZE,
    });
  },

  async exportContactsCsv(
    organizationId: string,
    filters: ContactExportQuery,
  ): Promise<{ csv: string; rowCount: number }> {
    const contacts = await crmContactsRepository.listForExport(
      organizationId,
      filters,
      MAX_CONTACT_EXPORT_ROWS + NEXT_ROW,
    );
    if (contacts.length > MAX_CONTACT_EXPORT_ROWS) {
      throw new AppError(
        "CRM_EXPORT_TOO_LARGE",
        `This list has more than ${MAX_CONTACT_EXPORT_ROWS} contacts. Narrow your filters first.`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    return {
      csv: toCsv(
        CONTACT_EXPORT_HEADERS,
        contacts.map((contact) => [
          contact.name,
          contact.email,
          contact.phone,
          contact.company,
          contact.jobTitle,
          contact.lifecycleStage,
          contact.source,
          contact.tags.join("; "),
          contact.ownerName,
          contact.createdAt.toISOString(),
        ]),
      ),
      rowCount: contacts.length,
    };
  },

  async getContact(organizationId: string, contactId: string): Promise<ContactWithRelations> {
    const contact = await crmContactsRepository.findById(organizationId, contactId);
    if (!contact)
      throw new AppError("CONTACT_NOT_FOUND", "Contact not found.", HTTP_STATUS.NOT_FOUND);
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
