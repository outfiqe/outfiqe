import { Button } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";

import { MetricSection } from "@/components/MetricParts";

import { useCrmPermissions } from "../hooks/useCrmPermissions";

const QUICK_ACTIONS = [
  { label: "New contact", to: "/crm/contacts", permission: "contacts:write" },
  { label: "New opportunity", to: "/crm/pipeline", permission: "deals:write" },
  { label: "New ticket", to: "/crm/support", permission: "tickets:write" },
  { label: "New task", to: "/crm/tasks", permission: "tasks:write" },
] as const;

const OPEN_NEW_RECORD_MODAL = { new: "yes" };

export const CrmQuickActions = () => {
  const { hasPermission } = useCrmPermissions();
  const allowedActions = QUICK_ACTIONS.filter(({ permission }) => hasPermission(permission));
  if (allowedActions.length === 0) return null;

  return (
    <MetricSection title="Quick actions" description="Add something new in one step.">
      <div className="flex flex-wrap gap-2">
        {allowedActions.map(({ label, to }) => (
          <Button key={label} asChild size="sm" variant="outline">
            <Link to={to} search={OPEN_NEW_RECORD_MODAL}>
              {label}
            </Link>
          </Button>
        ))}
      </div>
    </MetricSection>
  );
};
