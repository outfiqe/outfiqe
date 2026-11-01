import { describe, expect, it } from "vitest";

import type { TagReviewMetrics } from "../api/tagReviewsSchemas";
import { buildTagReviewInsight } from "./tagReviewInsight.utils";

const noTrend = { value: null, previousValue: null, deltaPercent: null };

const healthyMetrics: TagReviewMetrics = {
  overview: {
    tagsLive: noTrend,
    manualReviewRatePercent: noTrend,
    medianTimeToLiveHours: noTrend,
    approvedLast7d: { total: 6, manual: 3 },
    looksLiveLast7d: 6,
    openIssues: { count: 0, newLast7d: 0 },
  },
  reviewLatencyByPolicy: [
    { policy: "APPROVAL_REQUIRED", decidedCount: 6, p50Hours: 5, p90Hours: 20 },
  ],
  approvalSourceMix: [{ source: "BRAND", count: 6 }],
  rejectionReasonMix: [],
  timeToFirstShoppable: { looksWithApprovedTag: 6, p50Hours: 10, p90Hours: 30 },
  stuckApprovalRequiredCount: 0,
  waitingCount: 0,
  reports: { open: 0, last30Days: 0 },
};

describe("buildTagReviewInsight", () => {
  it("gives the all-clear only when nothing is wrong", () => {
    expect(buildTagReviewInsight(healthyMetrics).tone).toBe("success");
  });

  it("puts stuck tags and open reports ahead of everything else", () => {
    const { headline, detail, action } = buildTagReviewInsight({
      ...healthyMetrics,
      stuckApprovalRequiredCount: 2,
      reports: { open: 1, last30Days: 1 },
      timeToFirstShoppable: { looksWithApprovedTag: 9, p50Hours: 200, p90Hours: 300 },
    });

    expect(headline).toBe("3 issues need attention");
    expect(detail).toBe("2 tags stuck for over 7 days and 1 open tag report.");
    expect(action).toMatchObject({ kind: "tags", view: "STUCK" });
  });

  it("sends a report-only issue to the reports page in the singular", () => {
    const { headline, action } = buildTagReviewInsight({
      ...healthyMetrics,
      reports: { open: 1, last30Days: 1 },
    });

    expect(headline).toBe("1 issue needs attention");
    expect(action).toMatchObject({ kind: "reports" });
  });

  it("flags looks that miss the target once there is enough data", () => {
    const { tone, detail, action } = buildTagReviewInsight({
      ...healthyMetrics,
      timeToFirstShoppable: { looksWithApprovedTag: 9, p50Hours: 165.6, p90Hours: 300 },
    });

    expect(tone).toBe("negative");
    expect(detail).toContain("6.9 days");
    expect(action).toMatchObject({ kind: "tags", view: "FIRST_LIVE" });
  });

  it("flags slow brands once there is enough data", () => {
    const { headline } = buildTagReviewInsight({
      ...healthyMetrics,
      reviewLatencyByPolicy: [
        { policy: "APPROVAL_REQUIRED", decidedCount: 5, p50Hours: 30, p90Hours: 60 },
      ],
    });

    expect(headline).toBe("Brands are taking too long to answer");
  });

  it("does not judge slow brands on a single answer", () => {
    const { tone } = buildTagReviewInsight({
      ...healthyMetrics,
      reviewLatencyByPolicy: [
        { policy: "APPROVAL_REQUIRED", decidedCount: 1, p50Hours: 30, p90Hours: 60 },
      ],
    });

    expect(tone).toBe("success");
  });

  it("says it is too early when few looks are live", () => {
    const { tone, headline } = buildTagReviewInsight({
      ...healthyMetrics,
      timeToFirstShoppable: { looksWithApprovedTag: 1, p50Hours: 200, p90Hours: 200 },
    });

    expect(tone).toBe("neutral");
    expect(headline).toBe("Too early to judge speed");
  });

  it("calls out that no brand has checked a tag by hand", () => {
    const { headline } = buildTagReviewInsight({
      ...healthyMetrics,
      approvalSourceMix: [{ source: "POLICY_OPEN", count: 6 }],
    });

    expect(headline).toBe("No brand has checked a tag by hand yet");
  });
});
