import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type { CrmActivityType, CrmTaskStatus } from "#generated/prisma/enums.js";

import type {
  ActivityRecord,
  CreateActivityInput,
  CreateTaskInput,
  SubjectRef,
  TaskRecord,
  TimelineEntry,
} from "./crm-activities.types.js";
import { subjectToColumns } from "./crm-activities.utils.js";

const activitySelect = {
  id: true,
  organizationId: true,
  type: true,
  body: true,
  occurredAt: true,
  authorMembershipId: true,
  partnerCreatorId: true,
  customerUserId: true,
  dealId: true,
  createdAt: true,
  authorMembership: { select: { user: { select: { name: true } } } },
} as const;

const taskSelect = {
  id: true,
  organizationId: true,
  title: true,
  description: true,
  dueAt: true,
  status: true,
  assigneeMembershipId: true,
  createdByMembershipId: true,
  partnerCreatorId: true,
  customerUserId: true,
  dealId: true,
  completedAt: true,
  createdAt: true,
  assigneeMembership: { select: { user: { select: { name: true } } } },
} as const;

type ActivityRow = {
  id: string;
  organizationId: string;
  type: CrmActivityType;
  body: string;
  occurredAt: Date;
  authorMembershipId: string | null;
  partnerCreatorId: string | null;
  customerUserId: string | null;
  dealId: string | null;
  createdAt: Date;
  authorMembership: { user: { name: string } } | null;
};

type TaskRow = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  dueAt: Date;
  status: CrmTaskStatus;
  assigneeMembershipId: string;
  createdByMembershipId: string | null;
  partnerCreatorId: string | null;
  customerUserId: string | null;
  dealId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  assigneeMembership: { user: { name: string } } | null;
};

const toActivityRecord = (row: ActivityRow): ActivityRecord => ({
  id: row.id,
  organizationId: row.organizationId,
  type: row.type,
  body: row.body,
  occurredAt: row.occurredAt.toISOString(),
  authorMembershipId: row.authorMembershipId,
  authorName: row.authorMembership?.user.name ?? null,
  partnerCreatorId: row.partnerCreatorId,
  customerUserId: row.customerUserId,
  dealId: row.dealId,
  createdAt: row.createdAt.toISOString(),
});

const toTaskRecord = (row: TaskRow): TaskRecord => ({
  id: row.id,
  organizationId: row.organizationId,
  title: row.title,
  description: row.description,
  dueAt: row.dueAt.toISOString(),
  status: row.status,
  assigneeMembershipId: row.assigneeMembershipId,
  assigneeName: row.assigneeMembership?.user.name ?? null,
  createdByMembershipId: row.createdByMembershipId,
  partnerCreatorId: row.partnerCreatorId,
  customerUserId: row.customerUserId,
  dealId: row.dealId,
  completedAt: row.completedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
});

export const crmActivitiesRepository = {
  async createActivity(input: CreateActivityInput): Promise<ActivityRecord> {
    const columns = subjectToColumns(input.subject);
    const row = await prisma.crmActivity.create({
      data: {
        organizationId: input.organizationId,
        type: input.type,
        body: input.body,
        occurredAt: input.occurredAt,
        authorMembershipId: input.authorMembershipId,
        ...columns,
      },
      select: activitySelect,
    });
    return toActivityRecord(row);
  },

  async listActivitiesForSubject(
    organizationId: string,
    subject: SubjectRef,
    limit: number,
  ): Promise<ActivityRecord[]> {
    const rows = await prisma.crmActivity.findMany({
      where: { organizationId, ...subjectToColumns(subject) },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: limit,
      select: activitySelect,
    });
    return rows.map(toActivityRecord);
  },

  async findActivity(organizationId: string, activityId: string): Promise<ActivityRecord | null> {
    const row = await prisma.crmActivity.findFirst({
      where: { id: activityId, organizationId },
      select: activitySelect,
    });
    return row ? toActivityRecord(row) : null;
  },

  async deleteActivity(organizationId: string, activityId: string): Promise<void> {
    await prisma.crmActivity.delete({ where: { id: activityId, organizationId } });
  },

  async createTask(input: CreateTaskInput): Promise<TaskRecord> {
    const columns = input.subject
      ? subjectToColumns(input.subject)
      : { partnerCreatorId: null, customerUserId: null, dealId: null };
    const row = await prisma.crmTask.create({
      data: {
        organizationId: input.organizationId,
        title: input.title,
        description: input.description,
        dueAt: input.dueAt,
        assigneeMembershipId: input.assigneeMembershipId,
        createdByMembershipId: input.createdByMembershipId,
        ...columns,
      },
      select: taskSelect,
    });
    return toTaskRecord(row);
  },

  async listTasks(
    organizationId: string,
    filters: { assigneeMembershipId?: string; status?: CrmTaskStatus; subject?: SubjectRef },
  ): Promise<TaskRecord[]> {
    const rows = await prisma.crmTask.findMany({
      where: {
        organizationId,
        ...(filters.assigneeMembershipId
          ? { assigneeMembershipId: filters.assigneeMembershipId }
          : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.subject ? subjectToColumns(filters.subject) : {}),
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      select: taskSelect,
    });
    return rows.map(toTaskRecord);
  },

  async findTask(organizationId: string, taskId: string): Promise<TaskRecord | null> {
    const row = await prisma.crmTask.findFirst({
      where: { id: taskId, organizationId },
      select: taskSelect,
    });
    return row ? toTaskRecord(row) : null;
  },

  async updateTask(
    organizationId: string,
    taskId: string,
    data: {
      title?: string;
      description?: string | null;
      dueAt?: Date;
      assigneeMembershipId?: string;
      status?: CrmTaskStatus;
      completedAt?: Date | null;
    },
  ): Promise<TaskRecord> {
    const row = await prisma.crmTask.update({
      where: { id: taskId, organizationId },
      data,
      select: taskSelect,
    });
    return toTaskRecord(row);
  },

  async deleteTask(organizationId: string, taskId: string): Promise<void> {
    await prisma.crmTask.delete({ where: { id: taskId, organizationId } });
  },

  async findMembership(
    organizationId: string,
    membershipId: string,
  ): Promise<{ id: string; userId: string } | null> {
    return prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
      select: { id: true, userId: true },
    });
  },

  async timelineForSubject(
    organizationId: string,
    brandId: string,
    subject: SubjectRef,
    filter: { attributedCreatorId: string | null; buyerUserId: string | null },
    limit: number,
  ): Promise<TimelineEntry[]> {
    const columns = subjectToColumns(subject);
    const attributedCreatorId = filter.attributedCreatorId;
    const buyerUserId = filter.buyerUserId;

    const rows = await prisma.$queryRaw<TimelineRawRow[]>(Prisma.sql`
      WITH brand_products AS (
        SELECT id FROM products WHERE brand_id = ${brandId}::uuid
      ),
      activity_rows AS (
        SELECT 'activity' AS kind,
               a.id::text AS ref_id,
               a.occurred_at AS at,
               a.type::text AS activity_type,
               a.body AS body,
               u.name AS author_name,
               NULL::int AS item_count,
               NULL::int AS amount,
               NULL AS payment_status,
               NULL AS fulfilment_status
          FROM crm_activities a
          LEFT JOIN memberships m ON m.id = a.author_membership_id
          LEFT JOIN users u ON u.id = m.user_id
          WHERE a.organization_id = ${organizationId}::uuid
            AND a.partner_creator_id IS NOT DISTINCT FROM ${columns.partnerCreatorId}::uuid
            AND a.customer_user_id IS NOT DISTINCT FROM ${columns.customerUserId}::uuid
            AND a.deal_id IS NOT DISTINCT FROM ${columns.dealId}::uuid
      ),
      order_rows AS (
        SELECT 'order' AS kind,
               o.id::text AS ref_id,
               o.created_at AS at,
               NULL AS activity_type,
               NULL AS body,
               NULL AS author_name,
               COALESCE(SUM(oi.qty), 0)::int AS item_count,
               COALESCE(SUM(oi.qty * oi.unit_price), 0)::int AS amount,
               o.payment_status::text AS payment_status,
               o.fulfilment_status::text AS fulfilment_status
          FROM orders o
          JOIN order_items oi ON oi.order_id = o.id
          WHERE oi.product_id IN (SELECT id FROM brand_products)
            AND (${attributedCreatorId}::uuid IS NOT NULL OR ${buyerUserId}::uuid IS NOT NULL)
            AND (${attributedCreatorId}::uuid IS NULL
                 OR oi.attributed_creator_id = ${attributedCreatorId}::uuid)
            AND (${buyerUserId}::uuid IS NULL OR o.user_id = ${buyerUserId}::uuid)
          GROUP BY o.id, o.created_at, o.payment_status, o.fulfilment_status
      )
      SELECT * FROM (
        SELECT * FROM activity_rows
        UNION ALL
        SELECT * FROM order_rows
      ) merged
      ORDER BY at DESC
      LIMIT ${limit}
    `);

    return rows.map(toTimelineEntry);
  },
};

type TimelineRawRow = {
  kind: "activity" | "order";
  ref_id: string;
  at: Date;
  activity_type: string | null;
  body: string | null;
  author_name: string | null;
  item_count: number | null;
  amount: number | null;
  payment_status: string | null;
  fulfilment_status: string | null;
};

const toTimelineEntry = (row: TimelineRawRow): TimelineEntry =>
  row.kind === "activity"
    ? {
        kind: "activity",
        id: `activity:${row.ref_id}`,
        at: row.at.toISOString(),
        activityType: (row.activity_type ?? "NOTE") as CrmActivityType,
        body: row.body ?? "",
        authorName: row.author_name,
      }
    : {
        kind: "order",
        id: `order:${row.ref_id}`,
        at: row.at.toISOString(),
        orderId: row.ref_id,
        itemCount: row.item_count ?? 0,
        amount: row.amount ?? 0,
        paymentStatus: row.payment_status ?? "",
        fulfilmentStatus: row.fulfilment_status ?? "",
      };
