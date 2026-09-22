import type { TourStep } from "@outfiqe/design-system";
import type { TourKey } from "@outfiqe/types";

import { sidebarItemSelector } from "../utils/sidebarItemSelector";
import { buildTourReplayHref } from "./tourReplay";

export const CREATOR_DASHBOARD_TOUR_KEY = "creator-dashboard" satisfies TourKey;
export const CREATOR_DASHBOARD_TOUR_VERSION = 1;

export const CREATOR_TOUR_REPLAY_HREF = buildTourReplayHref(
  "/overview",
  CREATOR_DASHBOARD_TOUR_KEY,
);

export const CREATOR_KPI_TOUR_ANCHOR = "creator-kpis";

export const CREATOR_DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to your creator dashboard",
    body: "Here is a quick look at where everything lives. It takes about a minute, and you can skip it at any time.",
  },
  {
    id: "overview-figures",
    anchorSelector: `[data-tour-anchor="${CREATOR_KPI_TOUR_ANCHOR}"]`,
    title: "Your numbers at a glance",
    body: "Total earnings is every commission you have ever made from tagged products in your looks. Available and pending is what you can withdraw now versus what is still maturing.",
  },
  {
    id: "profile",
    anchorSelector: sidebarItemSelector("profile"),
    title: "Your profile",
    body: "This is where you post. Use the add-post button on your profile to share a new look, tag the products in it, and pick a layout.",
  },
  {
    id: "share",
    anchorSelector: sidebarItemSelector("share"),
    title: "Share",
    body: "Get a shareable link for a product. When someone buys through it, you earn a commission.",
  },
  {
    id: "earnings",
    anchorSelector: sidebarItemSelector("earnings"),
    title: "Earnings",
    body: "See every commission you have earned, one row per sale, and how each one is tracking toward payout.",
  },
  {
    id: "withdraw",
    anchorSelector: sidebarItemSelector("withdraw"),
    title: "Withdraw",
    body: "Add a bank account and request a withdrawal once you have an available balance.",
  },
  {
    id: "progress",
    anchorSelector: sidebarItemSelector("progress"),
    title: "Progress",
    body: "Track your level and XP as you post, sell and grow your reach.",
  },
  {
    id: "badges",
    anchorSelector: sidebarItemSelector("badges"),
    title: "Badges",
    body: "Collect badges for milestones, and feature your favourites on your public profile.",
  },
  {
    id: "challenges",
    anchorSelector: sidebarItemSelector("challenges"),
    title: "Challenges",
    body: "Time-boxed goals with their own badge reward. Check back here for what is currently running.",
  },
  {
    id: "finish",
    title: "You are all set",
    body: "You can replay this tour whenever you like with the Take the tour button.",
  },
];
