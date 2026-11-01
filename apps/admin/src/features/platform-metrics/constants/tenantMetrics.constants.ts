import type { PlatformOverview, TenantSort } from "../api/platformMetricsSchemas";

export const DEFAULT_TENANT_SORT: TenantSort = "recent-activity";

export const TENANT_SORT_OPTIONS: { value: TenantSort; label: string }[] = [
  { value: "recent-activity", label: "Recent activity" },
  { value: "name", label: "Name" },
  { value: "created", label: "Newest" },
  { value: "members", label: "Most members" },
  { value: "contacts", label: "Most contacts" },
  { value: "deals", label: "Most opportunities" },
  { value: "tickets", label: "Most tickets" },
  { value: "activities", label: "Most activities" },
];

export const TENANT_TOTAL_CARDS: {
  label: string;
  metricKey: Exclude<keyof PlatformOverview, "tenantsByPlan" | "tenantCount">;
  sort: TenantSort;
  hint: string;
}[] = [
  {
    label: "Members",
    metricKey: "totalMembers",
    sort: "members",
    hint: "People who belong to a business's CRM, added up across every business.",
  },
  {
    label: "Contacts",
    metricKey: "totalContacts",
    sort: "contacts",
    hint: "Contacts saved in the CRM, added up across every business.",
  },
  {
    label: "Opportunities",
    metricKey: "totalDeals",
    sort: "deals",
    hint: "Sales opportunities created, added up across every business.",
  },
  {
    label: "Tickets",
    metricKey: "totalTickets",
    sort: "tickets",
    hint: "Support tickets created, added up across every business.",
  },
  {
    label: "Activities",
    metricKey: "totalActivities",
    sort: "activities",
    hint: "Calls, notes and other activity logged, added up across every business.",
  },
];

export const TENANT_COUNT_CARDS: {
  label: string;
  metricKey:
    | "memberCount"
    | "activeMemberCount"
    | "contactCount"
    | "dealCount"
    | "ticketCount"
    | "activityCount"
    | "partnerCount"
    | "customerCount";
  hint: string;
}[] = [
  { label: "Members", metricKey: "memberCount", hint: "Everyone who belongs to this CRM." },
  {
    label: "Active members",
    metricKey: "activeMemberCount",
    hint: "Members who did something recently, from the latest daily count.",
  },
  { label: "Contacts", metricKey: "contactCount", hint: "Contacts saved in this CRM." },
  {
    label: "Opportunities",
    metricKey: "dealCount",
    hint: "Sales opportunities created in this CRM.",
  },
  { label: "Tickets", metricKey: "ticketCount", hint: "Support tickets created in this CRM." },
  {
    label: "Activities",
    metricKey: "activityCount",
    hint: "Calls, notes and other activity logged in this CRM.",
  },
  {
    label: "Partners",
    metricKey: "partnerCount",
    hint: "Muses and other partners linked to this business's brand.",
  },
  {
    label: "Customers",
    metricKey: "customerCount",
    hint: "Shoppers who have bought from this business's brand.",
  },
];

export const TENANT_ACTIVITY_MEASURES = [
  { dataKey: "activityCount", label: "Activities" },
  { dataKey: "contactCount", label: "Contacts" },
  { dataKey: "dealCount", label: "Opportunities" },
  { dataKey: "ticketCount", label: "Tickets" },
  { dataKey: "activeMemberCount", label: "Active members" },
] as const;

export type TenantActivityMeasure = (typeof TENANT_ACTIVITY_MEASURES)[number]["dataKey"];

export const TENANT_TABLE_HEADERS = [
  "Business",
  "Plan",
  "Members",
  "Contacts",
  "Opportunities",
  "Tickets",
  "Last used",
];

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  TRIALING: "On trial",
  ACTIVE: "Active",
  PAST_DUE: "Payment overdue",
  CANCELED: "Cancelled",
};

export const NEVER_USED_LABEL = "Never used";
export const VIEW_METRICS_PERMISSION = "platform:metrics:read";
export const VIEW_AS_SUPPORT_PERMISSIONS = ["platform:impersonate", "platform:impersonate:manage"];
