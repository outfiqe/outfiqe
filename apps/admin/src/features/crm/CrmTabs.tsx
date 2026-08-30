import { Link } from "@tanstack/react-router";

import { CrmSearchBox } from "./CrmSearchBox";

type CrmTab = { label: string; to: string; permissionKey: string | null };

const CRM_TABS: CrmTab[] = [
  { label: "Overview", to: "/crm", permissionKey: null },
  { label: "Partners", to: "/crm/partners", permissionKey: "accounts:read" },
  { label: "Customers", to: "/crm/customers", permissionKey: "customers:read" },
  { label: "Pipeline", to: "/crm/pipeline", permissionKey: "pipeline:read" },
  { label: "Tasks", to: "/crm/tasks", permissionKey: "tasks:read" },
  { label: "Support", to: "/crm/support", permissionKey: "tickets:read" },
  { label: "Reports", to: "/crm/reports", permissionKey: "reports:read" },
  { label: "Roles", to: "/crm/roles", permissionKey: "roles:read" },
  { label: "Billing", to: "/crm/billing", permissionKey: "billing:read" },
];

type CrmTabsProps = {
  viewerIsSuperAdmin: boolean;
  viewerPermissionKeys: string[];
};

export const CrmTabs = ({ viewerIsSuperAdmin, viewerPermissionKeys }: CrmTabsProps) => {
  const visibleTabs = CRM_TABS.filter(
    (tab) =>
      tab.permissionKey === null ||
      viewerIsSuperAdmin ||
      viewerPermissionKeys.includes(tab.permissionKey),
  );

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border">
      <nav className="flex items-center gap-1">
        {visibleTabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            activeOptions={{ exact: tab.to === "/crm" }}
            className="-mb-px cursor-pointer border-b-2 border-transparent px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "border-foreground text-foreground" }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="pb-2">
        <CrmSearchBox
          viewerIsSuperAdmin={viewerIsSuperAdmin}
          viewerPermissionKeys={viewerPermissionKeys}
        />
      </div>
    </div>
  );
};
