import { apiClient } from "@/lib/apiClient";

import {
  type Contact,
  type ContactLifecycleStage,
  type ContactListPage,
  contactListPageSchema,
  contactSchema,
} from "./contactsSchemas";

type ListParams = {
  q?: string;
  lifecycleStage?: ContactLifecycleStage;
  ownerMembershipId?: string;
  page?: number;
  pageSize?: number;
};

export type ContactInput = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  lifecycleStage: ContactLifecycleStage;
  source: string | null;
  tags: string[];
  notes: string | null;
  ownerMembershipId: string | null;
};

const listParams = ({ q, lifecycleStage, ownerMembershipId, page, pageSize }: ListParams) => ({
  ...(q ? { q } : {}),
  ...(lifecycleStage ? { lifecycleStage } : {}),
  ...(ownerMembershipId ? { ownerMembershipId } : {}),
  ...(page ? { page } : {}),
  ...(pageSize ? { pageSize } : {}),
});

type ContactExportFilters = {
  q?: string;
  lifecycleStage?: string;
  ownerMembershipId?: string;
};

const toExportParams = ({ q, lifecycleStage, ownerMembershipId }: ContactExportFilters) =>
  new URLSearchParams({
    ...(q ? { q } : {}),
    ...(lifecycleStage ? { lifecycleStage } : {}),
    ...(ownerMembershipId ? { ownerMembershipId } : {}),
  });

export const crmContactsApi = {
  async listContacts(params: ListParams = {}): Promise<ContactListPage> {
    const res = await apiClient.get<ContactListPage>("/crm/contacts", {
      params: listParams(params),
    });
    return contactListPageSchema.parse(res.data);
  },

  exportContacts(filters: ContactExportFilters): Promise<Blob> {
    return apiClient.getBlob(`/crm/contacts/export?${toExportParams(filters)}`);
  },

  async getContact(contactId: string): Promise<Contact> {
    const res = await apiClient.get<Contact>(`/crm/contacts/${contactId}`);
    return contactSchema.parse(res.data);
  },

  async createContact(body: ContactInput): Promise<Contact> {
    const res = await apiClient.post<Contact>("/crm/contacts", body);
    return contactSchema.parse(res.data);
  },

  async updateContact(contactId: string, body: Partial<ContactInput>): Promise<Contact> {
    const res = await apiClient.patch<Contact>(`/crm/contacts/${contactId}`, body);
    return contactSchema.parse(res.data);
  },

  async deleteContact(contactId: string): Promise<void> {
    await apiClient.del(`/crm/contacts/${contactId}`);
  },
};
