import type { AdminPageSkeletonSpec } from "./adminPageSkeleton.types";
import { FEATURES_DIR, ROW_COUNT, SESSION_TABLE_HEADERS } from "./pageSkeletonSpecs.constants";

export const brandTenantsPageSkeletonSpecs: Record<string, AdminPageSkeletonSpec> = {
  "/team": {
    title: "Team",
    blocks: [
      {
        kind: "formCard",
        fields: [
          { label: "Name", width: "medium" },
          { label: "Email", width: "large" },
          { label: "Role", width: "medium" },
        ],
        submitLabel: "Invite admin",
      },
      {
        kind: "cardRows",
        count: ROW_COUNT,
        hasBadge: false,
        hasMetaLine: true,
        hasTrailingBadge: true,
        actionLabels: [],
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/team/components/TeamPage.tsx`],
  },
  "/platform/impersonation": {
    title: "Impersonation",
    description:
      "Start a time-boxed, audited support session that acts as a specific tenant member. Every session is logged, visible to the tenant, and expires on its own.",
    spacing: "loose",
    blocks: [
      {
        kind: "formCard",
        fields: [
          { label: "Tenant", width: "large" },
          { label: "Act as", width: "large" },
          { label: "Reason", width: "large" },
          { label: "Scope", width: "small" },
          { label: "Minutes (optional)", width: "small" },
        ],
        submitLabel: "Start session",
      },
      {
        kind: "section",
        title: "Active sessions",
        blocks: [{ kind: "table", headers: [...SESSION_TABLE_HEADERS, "Actions"], rowCount: 3 }],
      },
      {
        kind: "section",
        title: "Recent history",
        blocks: [{ kind: "table", headers: SESSION_TABLE_HEADERS, rowCount: 3 }],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/platform-impersonation/components/PlatformImpersonationPage.tsx`,
      `${FEATURES_DIR}/platform-impersonation/components/SessionTable.tsx`,
    ],
  },
  "/platform/metrics": {
    title: "Tenant metrics",
    description:
      "Aggregate activity across every CRM tenant. Counts only — no tenant records are shown here.",
    blocks: [
      {
        kind: "labeledStats",
        isWide: true,
        labels: ["Tenants", "Members", "Contacts", "Deals", "Tickets", "Activities"],
      },
      { kind: "selectBar", options: ["All plans", "Recent activity"] },
      {
        kind: "table",
        headers: ["Tenant", "Plan", "Members", "Contacts", "Deals", "Tickets", "Last activity"],
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/platform-metrics/components/PlatformMetricsPage.tsx`],
  },
  "/platform/brand-applications": {
    title: "Brand applications",
    blocks: [
      { kind: "filterTabs", labels: ["Pending", "Approved", "Rejected"] },
      {
        kind: "cardRows",
        count: ROW_COUNT,
        textLineCount: 2,
        actionSize: "default",
        actionLabels: ["Approve", "Reject"],
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/brand-applications/components/BrandApplicationsPage.tsx`],
  },
  "/organizations": {
    title: "Organizations",
    description:
      "Each organization is a fully independent CRM tenant — its own members, roles, and data. Pick a business already on Outfiqe; they become the new organization's owner once they accept.",
    blocks: [
      {
        kind: "formCard",
        fields: [
          { label: "Business", width: "large" },
          { label: "Subdomain", width: "medium" },
        ],
        submitLabel: "Create organization",
      },
      { kind: "cardRows", count: ROW_COUNT, hasBadge: false, actionLabels: [] },
    ],
    sourceFiles: [`${FEATURES_DIR}/organizations/components/OrganizationsPage.tsx`],
  },
};
