import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";

import type {
  ContactListFilters,
  ContactListPage,
  ContactWithRelations,
  CreateContactInput,
  UpdateContactInput,
} from "./crm-contacts.types.js";

const contactWithRelationsSelect = {
  id: true,
  organizationId: true,
  name: true,
  email: true,
  phone: true,
  company: true,
  jobTitle: true,
  lifecycleStage: true,
  source: true,
  tags: true,
  notes: true,
  linkedUserId: true,
  ownerMembershipId: true,
  createdAt: true,
  updatedAt: true,
  linkedUser: { select: { name: true, handle: true } },
  ownerMembership: { select: { user: { select: { name: true } } } },
} as const;

type ContactJoinRow = Prisma.ContactGetPayload<{ select: typeof contactWithRelationsSelect }>;

const toContactWithRelations = (row: ContactJoinRow): ContactWithRelations => ({
  id: row.id,
  organizationId: row.organizationId,
  name: row.name,
  email: row.email,
  phone: row.phone,
  company: row.company,
  jobTitle: row.jobTitle,
  lifecycleStage: row.lifecycleStage,
  source: row.source,
  tags: row.tags,
  notes: row.notes,
  linkedUserId: row.linkedUserId,
  ownerMembershipId: row.ownerMembershipId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  ownerName: row.ownerMembership?.user.name ?? null,
  linkedUserName: row.linkedUser?.name ?? null,
  linkedUserHandle: row.linkedUser?.handle ?? null,
});

const buildWhere = (
  organizationId: string,
  filters: ContactListFilters,
): Prisma.ContactWhereInput => {
  const where: Prisma.ContactWhereInput = { organizationId };
  if (filters.lifecycleStage) where.lifecycleStage = filters.lifecycleStage;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { email: { contains: filters.q, mode: "insensitive" } },
      { company: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return where;
};

export const crmContactsRepository = {
  async list(organizationId: string, filters: ContactListFilters): Promise<ContactListPage> {
    const where = buildWhere(organizationId, filters);
    const skip = (filters.page - 1) * filters.pageSize;

    const [rows, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: filters.pageSize,
        select: contactWithRelationsSelect,
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      items: rows.map(toContactWithRelations),
      total,
      hasMore: skip + rows.length < total,
    };
  },

  async findById(organizationId: string, contactId: string): Promise<ContactWithRelations | null> {
    const row = await prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      select: contactWithRelationsSelect,
    });
    return row ? toContactWithRelations(row) : null;
  },

  async create(input: CreateContactInput): Promise<ContactWithRelations> {
    const row = await prisma.contact.create({
      data: input,
      select: contactWithRelationsSelect,
    });
    return toContactWithRelations(row);
  },

  async update(
    organizationId: string,
    contactId: string,
    data: UpdateContactInput,
  ): Promise<ContactWithRelations> {
    const row = await prisma.contact.update({
      where: { id: contactId, organizationId },
      data,
      select: contactWithRelationsSelect,
    });
    return toContactWithRelations(row);
  },

  async delete(organizationId: string, contactId: string): Promise<void> {
    await prisma.contact.delete({ where: { id: contactId, organizationId } });
  },

  async findMembership(
    organizationId: string,
    membershipId: string,
  ): Promise<{ id: string } | null> {
    return prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
      select: { id: true },
    });
  },

  async userExists(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    return user !== null;
  },
};
