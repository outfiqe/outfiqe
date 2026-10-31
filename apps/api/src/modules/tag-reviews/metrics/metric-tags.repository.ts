import { differenceInSeconds } from "date-fns/differenceInSeconds";
import { subDays } from "date-fns/subDays";
import { z } from "zod";

import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type {
  BrandTagReviewPolicy,
  TagApprovalSource,
  TagRejectionReason,
} from "#generated/prisma/enums.js";
import { TagReviewStatus } from "#generated/prisma/enums.js";
import {
  buildCursorPage,
  decodeCursor,
  encodeCursor,
  NEXT_PAGE_PROBE_ROWS,
} from "#lib/pagination.utils.js";

import { TAG_REVIEW_METRIC_VIEW, type TagReviewMetricView } from "../tag-review.constants.js";
import type { ListMetricTagsQuery } from "../tag-review.schemas.js";
import type { TagReviewMetricTag, TagReviewMetricTagPage } from "../tag-review.types.js";
import {
  LOOK_IS_LIVE_SQL,
  secondsToHours,
  STUCK_TAG_AGE_DAYS,
  TAG_APPROVED_AT_SQL,
  TREND_WINDOW_DAYS,
} from "./metrics.sql.js";

type MetricTagViewDefinition = {
  filter: Prisma.Sql;
  sortValue: Prisma.Sql;
  isOldestFirst: boolean;
};

type MetricTagRow = {
  id: string;
  review_status: TagReviewStatus;
  approval_source: TagApprovalSource | null;
  rejection_reason: TagRejectionReason | null;
  rejection_note: string | null;
  re_request_count: number;
  size_worn: string | null;
  submitted_at: Date;
  reviewed_at: Date | null;
  look_id: string;
  look_image_url: string;
  look_caption: string | null;
  look_posted_at: Date;
  creator_id: string;
  creator_name: string;
  creator_handle: string;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  brand_id: string;
  brand_name: string;
  brand_policy: BrandTagReviewPolicy;
  reviewer_name: string | null;
  report_count: number;
  sort_value: number;
};

const metricTagCursorSchema = z.object({ v: z.number(), i: z.uuid() });

const METRIC_TAG_JOINS = Prisma.sql`
  FROM creator_look_products clp
  JOIN creator_looks cl ON cl.id = clp.creator_look_id
  JOIN users creator ON creator.id = cl.creator_id
  JOIN products p ON p.id = clp.product_id
  JOIN brands b ON b.id = p.brand_id
  LEFT JOIN users reviewer ON reviewer.id = clp.reviewed_by_id
`;

const NEWEST_DECISION_FIRST = {
  sortValue: Prisma.sql`EXTRACT(EPOCH FROM ${TAG_APPROVED_AT_SQL})::double precision`,
  isOldestFirst: false,
};

const LONGEST_WAITING_FIRST = {
  sortValue: Prisma.sql`EXTRACT(EPOCH FROM clp.submitted_at)::double precision`,
  isOldestFirst: true,
};

const SLOWEST_DECISION_FIRST = {
  sortValue: Prisma.sql`
    EXTRACT(EPOCH FROM (clp.reviewed_at - clp.submitted_at))::double precision
  `,
  isOldestFirst: false,
};

const SLOWEST_TO_GO_LIVE_FIRST = {
  sortValue: Prisma.sql`
    EXTRACT(EPOCH FROM (${TAG_APPROVED_AT_SQL} - cl.created_at))::double precision
  `,
  isOldestFirst: false,
};

const IS_APPROVED_SQL = Prisma.sql`clp.review_status = 'APPROVED'`;
const IS_PENDING_SQL = Prisma.sql`clp.review_status = 'PENDING'`;

const IS_FIRST_APPROVED_TAG_OF_LOOK_SQL = Prisma.sql`
  clp.review_status = 'APPROVED' AND clp.id = (
    SELECT first_tag.id
    FROM creator_look_products first_tag
    WHERE first_tag.creator_look_id = clp.creator_look_id
      AND first_tag.review_status = 'APPROVED'
    ORDER BY COALESCE(first_tag.reviewed_at, first_tag.submitted_at), first_tag.id
    LIMIT 1
  )
`;

const buildViewDefinition = (view: TagReviewMetricView, now: Date): MetricTagViewDefinition => {
  switch (view) {
    case TAG_REVIEW_METRIC_VIEW.LIVE:
      return { filter: IS_APPROVED_SQL, ...NEWEST_DECISION_FIRST };
    case TAG_REVIEW_METRIC_VIEW.APPROVED_THIS_WEEK:
      return {
        filter: Prisma.sql`
          ${IS_APPROVED_SQL} AND ${TAG_APPROVED_AT_SQL} >= ${subDays(now, TREND_WINDOW_DAYS)}
        `,
        ...NEWEST_DECISION_FIRST,
      };
    case TAG_REVIEW_METRIC_VIEW.WAITING:
      return { filter: IS_PENDING_SQL, ...LONGEST_WAITING_FIRST };
    case TAG_REVIEW_METRIC_VIEW.STUCK:
      return {
        filter: Prisma.sql`
          ${IS_PENDING_SQL}
          AND clp.submitted_at < ${subDays(now, STUCK_TAG_AGE_DAYS)}
          AND b.tag_review_policy = 'APPROVAL_REQUIRED'
        `,
        ...LONGEST_WAITING_FIRST,
      };
    case TAG_REVIEW_METRIC_VIEW.REJECTED:
      return { filter: Prisma.sql`clp.review_status = 'REJECTED'`, ...NEWEST_DECISION_FIRST };
    case TAG_REVIEW_METRIC_VIEW.BRAND_DECISIONS:
      return {
        filter: Prisma.sql`clp.reviewed_by_id IS NOT NULL AND clp.reviewed_at IS NOT NULL`,
        ...SLOWEST_DECISION_FIRST,
      };
    case TAG_REVIEW_METRIC_VIEW.FIRST_LIVE:
      return { filter: IS_FIRST_APPROVED_TAG_OF_LOOK_SQL, ...SLOWEST_TO_GO_LIVE_FIRST };
    case TAG_REVIEW_METRIC_VIEW.FIRST_LIVE_THIS_WEEK:
      return {
        filter: Prisma.sql`
          ${IS_FIRST_APPROVED_TAG_OF_LOOK_SQL}
          AND ${TAG_APPROVED_AT_SQL} >= ${subDays(now, TREND_WINDOW_DAYS)}
        `,
        ...SLOWEST_TO_GO_LIVE_FIRST,
      };
  }
};

const buildMatchingTagConditions = (
  { source, reason, policy }: ListMetricTagsQuery,
  { filter }: MetricTagViewDefinition,
): Prisma.Sql[] => {
  const conditions = [LOOK_IS_LIVE_SQL, filter];
  if (source) conditions.push(Prisma.sql`clp.approval_source::text = ${source}`);
  if (reason) conditions.push(Prisma.sql`clp.rejection_reason::text = ${reason}`);
  if (policy) conditions.push(Prisma.sql`b.tag_review_policy::text = ${policy}`);
  return conditions;
};

const buildCursorCondition = (
  cursor: string | undefined,
  { sortValue, isOldestFirst }: MetricTagViewDefinition,
): Prisma.Sql | null => {
  const parsedCursor = metricTagCursorSchema.safeParse(decodeCursor<unknown>(cursor));
  if (!parsedCursor.success) return null;

  const { v: cursorSortValue, i: cursorTagId } = parsedCursor.data;
  const comparison = isOldestFirst ? Prisma.sql`>` : Prisma.sql`<`;
  return Prisma.sql`
    (${sortValue}, clp.id) ${comparison} (${cursorSortValue}::double precision, ${cursorTagId}::uuid)
  `;
};

const fetchMetricTagRows = (
  conditions: Prisma.Sql[],
  { sortValue, isOldestFirst }: MetricTagViewDefinition,
  rowLimit: number,
): Promise<MetricTagRow[]> => {
  const direction = isOldestFirst ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  return prisma.$queryRaw<MetricTagRow[]>(Prisma.sql`
    SELECT clp.id, clp.review_status, clp.approval_source, clp.rejection_reason,
           clp.rejection_note, clp.re_request_count, clp.size_worn, clp.submitted_at,
           clp.reviewed_at,
           cl.id AS look_id, cl.image_url AS look_image_url, cl.caption AS look_caption,
           cl.created_at AS look_posted_at,
           creator.id AS creator_id, creator.name AS creator_name,
           creator.handle AS creator_handle,
           p.id AS product_id, p.name AS product_name, p.image_url AS product_image_url,
           b.id AS brand_id, b.name AS brand_name, b.tag_review_policy AS brand_policy,
           reviewer.name AS reviewer_name,
           (
             SELECT COUNT(*)::int
             FROM tag_review_reports report
             WHERE report.creator_look_product_id = clp.id
           ) AS report_count,
           ${sortValue} AS sort_value
    ${METRIC_TAG_JOINS}
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY sort_value ${direction}, clp.id ${direction}
    LIMIT ${rowLimit}
  `);
};

const countMatchingTags = async (conditions: Prisma.Sql[]): Promise<number> => {
  const [{ total } = { total: 0 }] = await prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
    SELECT COUNT(*)::int AS total
    ${METRIC_TAG_JOINS}
    WHERE ${Prisma.join(conditions, " AND ")}
  `);
  return total;
};

const toMetricTag = (row: MetricTagRow, now: Date): TagReviewMetricTag => {
  const isWaiting = row.review_status === TagReviewStatus.PENDING;
  const isApproved = row.review_status === TagReviewStatus.APPROVED;
  const decidedAt = isWaiting ? null : (row.reviewed_at ?? row.submitted_at);

  return {
    id: row.id,
    reviewStatus: row.review_status,
    approvalSource: row.approval_source,
    rejectionReason: row.rejection_reason,
    rejectionNote: row.rejection_note,
    reRequestCount: row.re_request_count,
    sizeWorn: row.size_worn,
    reportCount: row.report_count,
    submittedAt: row.submitted_at,
    decidedAt,
    reviewerName: row.reviewer_name,
    waitHours: secondsToHours(differenceInSeconds(decidedAt ?? now, row.submitted_at)),
    hoursToGoLive:
      isApproved && decidedAt
        ? secondsToHours(differenceInSeconds(decidedAt, row.look_posted_at))
        : null,
    look: {
      id: row.look_id,
      imageUrl: row.look_image_url,
      caption: row.look_caption,
      postedAt: row.look_posted_at,
    },
    creator: { id: row.creator_id, name: row.creator_name, handle: row.creator_handle },
    product: { id: row.product_id, name: row.product_name, imageUrl: row.product_image_url },
    brand: { id: row.brand_id, name: row.brand_name, policy: row.brand_policy },
  };
};

export const tagReviewMetricTagsRepository = {
  async listMetricTags(query: ListMetricTagsQuery): Promise<TagReviewMetricTagPage> {
    const { view, cursor, limit } = query;
    const now = new Date();
    const viewDefinition = buildViewDefinition(view, now);
    const matchingTagConditions = buildMatchingTagConditions(query, viewDefinition);
    const cursorCondition = buildCursorCondition(cursor, viewDefinition);

    const [rows, totalCount] = await Promise.all([
      fetchMetricTagRows(
        cursorCondition ? [...matchingTagConditions, cursorCondition] : matchingTagConditions,
        viewDefinition,
        limit + NEXT_PAGE_PROBE_ROWS,
      ),
      countMatchingTags(matchingTagConditions),
    ]);

    const { items, nextCursor } = buildCursorPage(rows, limit, ({ sort_value, id }) =>
      encodeCursor({ v: sort_value, i: id }),
    );

    return { items: items.map((row) => toMetricTag(row, now)), nextCursor, totalCount };
  },
};
