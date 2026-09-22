import type { TourStep } from "@outfiqe/design-system";
import type { TourKey } from "@outfiqe/types";

import { sidebarItemSelector } from "../utils/sidebarItemSelector";

export const PLATFORM_DASHBOARD_TOUR_KEY = "platform-dashboard" satisfies TourKey;
export const PLATFORM_DASHBOARD_TOUR_VERSION = 1;

export const PLATFORM_TOUR_REPLAY_TO = "/platform";
export const PLATFORM_TOUR_REPLAY_SEARCH = { tour: PLATFORM_DASHBOARD_TOUR_KEY };

export const PLATFORM_KPI_TOUR_ANCHOR = "platform-kpis";

export type PlatformTourStep = TourStep & {
  groupKey: string | null;
};

const groupSelector = (groupKey: string) => sidebarItemSelector(`platform-group-${groupKey}`);

const WELCOME_STEP: PlatformTourStep = {
  id: "welcome",
  groupKey: null,
  title: "Welcome to the platform panel",
  body: "This is where Outfiqe's own team runs the platform itself, separate from any one tenant's CRM: every brand and organization, the shared catalog, moderation, finance, growth tools and settings. This walkthrough takes about a minute, and you can skip it at any time.",
};

const KPI_STEP: PlatformTourStep = {
  id: "kpis",
  groupKey: null,
  anchorSelector: `[data-tour-anchor="${PLATFORM_KPI_TOUR_ANCHOR}"]`,
  title: "Platform-wide totals",
  body: "Tenants, members, contacts, deals, tickets and logged activity, added up across every customer organization. Hover the info marker on any card to see exactly what it counts. Further down, Settlement reconciliation compares what the payment gateways are holding against what the ledger says is owed.",
};

const FINISH_STEP: PlatformTourStep = {
  id: "finish",
  groupKey: null,
  title: "You're all set",
  body: "You can replay this tour whenever you like with the Take the tour button.",
};

const GROUP_STEPS: PlatformTourStep[] = [
  {
    id: "brand-tenants",
    groupKey: "brand-tenants",
    anchorSelector: groupSelector("brand-tenants"),
    title: "Brand & Tenants",
    body: "Review brand applications, see usage metrics for each tenant organization, step into an organization's CRM to help when they're stuck, and manage the organizations and the internal team who run this platform.",
  },
  {
    id: "catalog",
    groupKey: "catalog",
    anchorSelector: groupSelector("catalog"),
    title: "Catalog",
    body: "The shared catalog every brand lists into: products awaiting approval, collections, categories, garment types, size options, and the hero slides shown on the storefront home page.",
  },
  {
    id: "commerce",
    groupKey: "commerce",
    anchorSelector: groupSelector("commerce"),
    title: "Commerce",
    body: "Every order placed platform-wide, coupon campaigns, and the delivery zones that decide shipping cost and eligibility.",
  },
  {
    id: "moderation",
    groupKey: "moderation",
    anchorSelector: groupSelector("moderation"),
    title: "Moderation & Support",
    body: "Everything that needs a human look: support requests, product reviews, creator tag reviews and reports, flagged content, and user accounts.",
  },
  {
    id: "finance",
    groupKey: "finance",
    anchorSelector: groupSelector("finance"),
    title: "Finance",
    body: "Creator commissions, the platform's own commission rules, withdrawal requests and policy, and the financial rollup that reconciles money collected against money owed.",
  },
  {
    id: "growth",
    groupKey: "growth",
    anchorSelector: groupSelector("growth"),
    title: "Growth",
    body: "Trending debug tools, the creators directory, announcements sent to users, and the gamification system: XP and levels, badges and challenges, and leaderboards.",
  },
  {
    id: "platform-settings",
    groupKey: "platform-settings",
    anchorSelector: groupSelector("platform-settings"),
    title: "Platform Settings",
    body: "Feature flags that turn functionality on or off platform-wide, and, for co-founders only, control over which parts of this navigation other admins can see.",
  },
];

export const PLATFORM_DASHBOARD_TOUR_STEPS: PlatformTourStep[] = [
  WELCOME_STEP,
  KPI_STEP,
  ...GROUP_STEPS,
  FINISH_STEP,
];
