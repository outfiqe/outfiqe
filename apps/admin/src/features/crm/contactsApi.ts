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

const listParams = ({ q, lifecycleStage, page, pageSize }: ListParams) => ({
  ...(q ? { q } : {}),
  ...(lifecycleStage ? { lifecycleStage } : {}),
  ...(page ? { page } : {}),
  ...(pageSize ? { pageSize } : {}),
});

export const crmContactsApi = {
  async listContacts(params: ListParams = {}): Promise<ContactListPage> {
    const res = await apiClient.get<ContactListPage>("/crm/contacts", {
      params: listParams(params),
    });
    return contactListPageSchema.parse(res.data);
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
