import { CRM_COUNTER_RECONCILE_INTERVAL_MS, recomputeCrmCounters } from "#lib/crm-counters.js";
import { nextIsoWeekStart } from "#lib/iso-week.utils.js";
import { DYNAMIC_BADGE_RECHECK_INTERVAL_MS } from "#modules/achievements/achievement.constants.js";
import { achievementService } from "#modules/achievements/achievement.service.js";
import { AUTH_RETENTION_SWEEP_INTERVAL_MS } from "#modules/auth/auth.constants.js";
import { runAuthRetentionSweep } from "#modules/auth/auth.retention.js";
import { runBrandPayoutLifecycleSweep } from "#modules/brand-payouts/brandPayout.lifecycle.js";
import { COMMISSION_SWEEP_INTERVAL_MS } from "#modules/commissions/commission.constants.js";
import { runCommissionLifecycleSweep } from "#modules/commissions/commission.lifecycle.js";
import { creatorCompetitionService } from "#modules/creator-competitions/creatorCompetition.service.js";
import { CREATOR_LEADERBOARD_RECOMPUTE_INTERVAL_MS } from "#modules/creator-leaderboard/creatorLeaderboard.constants.js";
import { creatorLeaderboardService } from "#modules/creator-leaderboard/creatorLeaderboard.service.js";
import {
  TAG_TREND_AGGREGATION_INTERVAL_MS,
  TAG_TREND_SCORING_INTERVAL_MS,
  TRENDING_AGGREGATION_INTERVAL_MS,
  TRENDING_SCORING_INTERVAL_MS,
} from "#modules/creator-looks/creatorLook.constants.js";
import { creatorLookService } from "#modules/creator-looks/creatorLook.service.js";
import {
  INVOICE_RECONCILE_INTERVAL_MS,
  RENEWAL_SWEEP_INTERVAL_MS,
} from "#modules/crm-billing/crm-billing.constants.js";
import {
  runCrmBillingReconciliationSweep,
  runCrmSubscriptionRenewalSweep,
} from "#modules/crm-billing/crm-billing.jobs.js";
import {
  FASTEST_GROWING_RECOMPUTE_INTERVAL_MS,
  MOST_PURCHASED_RECOMPUTE_INTERVAL_MS,
  TRENDING_RECOMPUTE_INTERVAL_MS,
} from "#modules/leaderboard/leaderboard.constants.js";
import { leaderboardService } from "#modules/leaderboard/leaderboard.service.js";
import { NOTIFICATION_RETENTION_SWEEP_INTERVAL_MS } from "#modules/notifications/notification.constants.js";
import { runNotificationRetentionSweep } from "#modules/notifications/notification.retention.js";
import { RECONCILE_CHECK_INTERVAL_MS } from "#modules/payments/payment.constants.js";
import { runPaymentReconciliationSweep } from "#modules/payments/payment.reconciliation.js";
import {
  AGGREGATION_INTERVAL_MS,
  SCORING_INTERVAL_MS,
} from "#modules/trending/trending.constants.js";
import { trendingService } from "#modules/trending/trending.service.js";
import type { BoundaryJob, RecurringJob } from "#scheduling/scheduler.types.js";

export const INTERVAL_JOBS: RecurringJob[] = [
  {
    name: "payment-reconciliation",
    run: runPaymentReconciliationSweep,
    intervalMs: RECONCILE_CHECK_INTERVAL_MS,
  },
  {
    name: "commission-lifecycle",
    run: runCommissionLifecycleSweep,
    intervalMs: COMMISSION_SWEEP_INTERVAL_MS,
  },
  {
    name: "brand-payout-lifecycle",
    run: runBrandPayoutLifecycleSweep,
    intervalMs: COMMISSION_SWEEP_INTERVAL_MS,
  },
  {
    name: "crm-subscription-renewal",
    run: runCrmSubscriptionRenewalSweep,
    intervalMs: RENEWAL_SWEEP_INTERVAL_MS,
  },
  {
    name: "crm-billing-reconciliation",
    run: runCrmBillingReconciliationSweep,
    intervalMs: INVOICE_RECONCILE_INTERVAL_MS,
  },
  {
    name: "trending-aggregation",
    run: trendingService.runAggregation,
    intervalMs: AGGREGATION_INTERVAL_MS,
  },
  {
    name: "trending-scoring",
    run: trendingService.runScoring,
    intervalMs: SCORING_INTERVAL_MS,
  },
  {
    name: "explore-trending-aggregation",
    run: creatorLookService.runTrendingAggregation,
    intervalMs: TRENDING_AGGREGATION_INTERVAL_MS,
  },
  {
    name: "explore-trending-scoring",
    run: creatorLookService.runTrendingScoring,
    intervalMs: TRENDING_SCORING_INTERVAL_MS,
  },
  {
    name: "explore-tag-trending-aggregation",
    run: creatorLookService.runTagTrendingAggregation,
    intervalMs: TAG_TREND_AGGREGATION_INTERVAL_MS,
  },
  {
    name: "explore-tag-trending-scoring",
    run: creatorLookService.runTagTrendingScoring,
    intervalMs: TAG_TREND_SCORING_INTERVAL_MS,
  },
  {
    name: "leaderboard-most-purchased",
    run: leaderboardService.runMostPurchasedRecompute,
    intervalMs: MOST_PURCHASED_RECOMPUTE_INTERVAL_MS,
  },
  {
    name: "leaderboard-trending",
    run: leaderboardService.runTrendingRecompute,
    intervalMs: TRENDING_RECOMPUTE_INTERVAL_MS,
  },
  {
    name: "leaderboard-fastest-growing",
    run: leaderboardService.runFastestGrowingRecompute,
    intervalMs: FASTEST_GROWING_RECOMPUTE_INTERVAL_MS,
  },
  {
    name: "creator-leaderboard-recompute",
    run: creatorLeaderboardService.runRecompute,
    intervalMs: CREATOR_LEADERBOARD_RECOMPUTE_INTERVAL_MS,
  },
  {
    name: "dynamic-badge-recheck",
    run: achievementService.recheckDynamicBadges,
    intervalMs: DYNAMIC_BADGE_RECHECK_INTERVAL_MS,
  },
  {
    name: "notification-retention-sweep",
    run: runNotificationRetentionSweep,
    intervalMs: NOTIFICATION_RETENTION_SWEEP_INTERVAL_MS,
  },
  {
    name: "auth-retention-sweep",
    run: runAuthRetentionSweep,
    intervalMs: AUTH_RETENTION_SWEEP_INTERVAL_MS,
  },
  {
    name: "crm-counter-reconcile",
    run: recomputeCrmCounters,
    intervalMs: CRM_COUNTER_RECONCILE_INTERVAL_MS,
  },
];

export const BOUNDARY_JOBS: BoundaryJob[] = [
  {
    name: "leaderboard-boundary-most-purchased",
    run: leaderboardService.runMostPurchasedRecompute,
    nextRunAt: nextIsoWeekStart,
  },
  {
    name: "leaderboard-boundary-trending",
    run: leaderboardService.runTrendingRecompute,
    nextRunAt: nextIsoWeekStart,
  },
  {
    name: "leaderboard-boundary-fastest-growing",
    run: leaderboardService.runFastestGrowingRecompute,
    nextRunAt: nextIsoWeekStart,
  },
  {
    name: "creator-leaderboard-boundary-recompute",
    run: creatorLeaderboardService.runRecompute,
    nextRunAt: nextIsoWeekStart,
  },
  {
    name: "creator-competition-boundary-settlement",
    run: creatorCompetitionService.runWeeklySettlement,
    nextRunAt: nextIsoWeekStart,
  },
];
