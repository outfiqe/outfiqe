import type { TourStep } from "@outfiqe/design-system";
import type { TourKey } from "@outfiqe/types";

import { sidebarItemSelector } from "../utils/sidebarItemSelector";

export const CRM_DASHBOARD_TOUR_KEY = "crm-dashboard" satisfies TourKey;
export const CRM_DASHBOARD_TOUR_VERSION = 1;

export const CRM_TOUR_REPLAY_TO = "/crm";
export const CRM_TOUR_REPLAY_SEARCH = { tour: CRM_DASHBOARD_TOUR_KEY };

export const CRM_SEARCH_TOUR_ANCHOR = "crm-search";

export type CrmTourStep = TourStep & {
  permissionKey: string | null;
  requiresLinkedBrand?: boolean;
};

const WELCOME_STEP: CrmTourStep = {
  id: "welcome",
  permissionKey: null,
  title: "Welcome to the CRM",
  body: "This is Outfiqe's internal tool for running this organization: your creators and shoppers, your deals, your support queue and your team. It's separate from anything a customer or creator sees. This walkthrough takes about a minute, and you can skip it at any time.",
};

const SEARCH_STEP: CrmTourStep = {
  id: "search",
  permissionKey: null,
  anchorSelector: `[data-tour-anchor="${CRM_SEARCH_TOUR_ANCHOR}"]`,
  title: "Search across everything",
  body: "One box searches every CRM entity at once — Partners, Customers, Deals and Tickets. Pick a result and it takes you straight to that record.",
};

const FINISH_STEP: CrmTourStep = {
  id: "finish",
  permissionKey: null,
  title: "You're all set",
  body: "You can replay this tour whenever you like with the Take the tour button. What you saw here matches your own role — a teammate with different permissions may see a shorter or longer version.",
};

const SIDEBAR_ITEM_STEPS: CrmTourStep[] = [
  {
    id: "partners",
    anchorSelector: sidebarItemSelector("crm-partners"),
    permissionKey: "accounts:read",
    requiresLinkedBrand: true,
    title: "Partners",
    body: "Every creator who has tagged or sold this brand's products, with a breakdown of which products drove revenue for each one.",
  },
  {
    id: "customers",
    anchorSelector: sidebarItemSelector("crm-customers"),
    permissionKey: "customers:read",
    requiresLinkedBrand: true,
    title: "Customers",
    body: "Every shopper who has bought from this brand, with their order history in one place.",
  },
  {
    id: "contacts",
    anchorSelector: sidebarItemSelector("crm-contacts"),
    permissionKey: "contacts:read",
    title: "Contacts",
    body: "A manually-kept address book for people who aren't a creator or a shopper on Outfiqe yet — a lead, a vendor, anyone worth tracking outside the platform's own accounts.",
  },
  {
    id: "pipeline",
    anchorSelector: sidebarItemSelector("crm-pipeline"),
    permissionKey: "pipeline:read",
    title: "Pipeline",
    body: "A board of deals moving through the stages you define. Drag a deal to a new stage to update it, or open it to see the full detail.",
  },
  {
    id: "tasks",
    anchorSelector: sidebarItemSelector("crm-tasks"),
    permissionKey: "tasks:read",
    title: "Tasks",
    body: "Your team's due-dated to-do list, with overdue items flagged and a checkbox to mark one done.",
  },
  {
    id: "support",
    anchorSelector: sidebarItemSelector("crm-support"),
    permissionKey: "tickets:read",
    title: "Support",
    body: "Customer support tickets. Open one to read the full thread, change its status as you work it, and reassign it if it needs a different owner.",
  },
  {
    id: "reports",
    anchorSelector: sidebarItemSelector("crm-reports"),
    permissionKey: "reports:read",
    title: "Reports",
    body: "How the pipeline and the support queue are performing: open and won deal value, ticket volume, and how quickly tickets get resolved.",
  },
  {
    id: "roles",
    anchorSelector: sidebarItemSelector("crm-roles"),
    permissionKey: "roles:read",
    title: "Roles",
    body: "Who is on your CRM team and what each person can do. Built-in roles are fixed; you can also build a custom role from the full permission list.",
  },
  {
    id: "audit",
    anchorSelector: sidebarItemSelector("crm-audit"),
    permissionKey: "audit:read",
    title: "Audit",
    body: "A running, timestamped log of every sensitive change made in this CRM — who did it, and what changed.",
  },
  {
    id: "billing",
    anchorSelector: sidebarItemSelector("crm-billing"),
    permissionKey: "billing:read",
    requiresLinkedBrand: true,
    title: "Billing",
    body: "Your subscription plan, seat count and invoice history, and where to pay if a renewal is due.",
  },
];

export const CRM_DASHBOARD_TOUR_STEPS: CrmTourStep[] = [
  WELCOME_STEP,
  SEARCH_STEP,
  ...SIDEBAR_ITEM_STEPS,
  FINISH_STEP,
];
