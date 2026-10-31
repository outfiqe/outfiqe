import { z } from "zod";

import {
  tagApprovalSourceSchema,
  tagPolicySchema,
  tagRejectionReasonSchema,
} from "../api/tagReviewsSchemas";
import {
  METRIC_TAG_VIEW,
  METRIC_TAG_VIEW_ORDER,
  type MetricTagsSearch,
} from "../constants/metricTagViews.constants";

const viewSearchSchema = z.enum(METRIC_TAG_VIEW_ORDER).catch(METRIC_TAG_VIEW.LIVE);
const sourceSearchSchema = tagApprovalSourceSchema.optional().catch(undefined);
const reasonSearchSchema = tagRejectionReasonSchema.optional().catch(undefined);
const policySearchSchema = tagPolicySchema.optional().catch(undefined);

export const toMetricTagsSearch = (search: Record<string, unknown>): MetricTagsSearch => ({
  view: viewSearchSchema.parse(search.view),
  source: sourceSearchSchema.parse(search.source),
  reason: reasonSearchSchema.parse(search.reason),
  policy: policySearchSchema.parse(search.policy),
});
