import type { ContactLifecycleStage } from "#generated/prisma/enums.js";

export type ContactRecord = {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  lifecycleStage: ContactLifecycleStage;
  source: string | null;
  tags: string[];
  notes: string | null;
  linkedUserId: string | null;
  ownerMembershipId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ContactWithRelations = ContactRecord & {
  ownerName: string | null;
  linkedUserName: string | null;
  linkedUserHandle: string | null;
};

export type ContactListPage = {
  items: ContactWithRelations[];
  total: number;
  hasMore: boolean;
};

export type ContactListFilters = {
  q?: string;
  lifecycleStage?: ContactLifecycleStage;
  page: number;
  pageSize: number;
};

export type CreateContactInput = {
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  lifecycleStage: ContactLifecycleStage;
  source: string | null;
  tags: string[];
  notes: string | null;
  linkedUserId: string | null;
  ownerMembershipId: string | null;
};

export type UpdateContactInput = Partial<Omit<CreateContactInput, "organizationId">>;
