import { Button, FilterChip, FormBanner, Skeleton } from "@outfiqe/design-system";
import { LOGISTICS_ALERT_LABELS, type LogisticsAlertType } from "@outfiqe/utils";
import { useState } from "react";

import { TextPromptModal } from "@/components/TextPromptModal";
import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import type { AlertListStatus, LogisticsAlert } from "../api/alertsSchemas";
import { useInfiniteLogisticsAlerts } from "../hooks/useInfiniteLogisticsAlerts";
import { useResolveLogisticsAlert } from "../hooks/useResolveLogisticsAlert";
import { LogisticsAlertRow } from "./LogisticsAlertRow";

const NO_ALERTS = 0;
const SKELETON_ROW_COUNT = 4;
const MIN_NOTE_LENGTH = 3;

const STATUS_FILTERS: { status: AlertListStatus; label: string }[] = [
  { status: "OPEN", label: "Open" },
  { status: "RESOLVED", label: "Resolved" },
];

export const LogisticsAlertsPage = () => {
  const { canUse } = usePlatformPermissions();
  const canResolve = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);
  const [status, setStatus] = useState<AlertListStatus>("OPEN");
  const [alertType, setAlertType] = useState<LogisticsAlertType | null>(null);
  const [alertToResolve, setAlertToResolve] = useState<LogisticsAlert | null>(null);
  const alertsQuery = useInfiniteLogisticsAlerts(status, alertType);
  const resolveAlert = useResolveLogisticsAlert();
  const pages = alertsQuery.data?.pages ?? [];
  const alerts = pages.flatMap((page) => page.items);
  const openCounts = pages[0]?.openCounts ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Delivery alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bags and parcels that are running late or need someone to look at them. Most clear on
          their own once the bag or parcel moves on; resolve the rest with a note.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Open or resolved alerts">
        {STATUS_FILTERS.map((filter) => (
          <FilterChip
            key={filter.status}
            isSelected={status === filter.status}
            onClick={() => setStatus(filter.status)}
          >
            {filter.label}
          </FilterChip>
        ))}
      </div>

      {openCounts.length > NO_ALERTS && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by alert">
          <FilterChip isSelected={alertType === null} onClick={() => setAlertType(null)}>
            All
          </FilterChip>
          {openCounts.map(({ alertType: countedType, openCount }) => (
            <FilterChip
              key={countedType}
              isSelected={alertType === countedType}
              onClick={() => setAlertType(countedType)}
            >
              {LOGISTICS_ALERT_LABELS[countedType]} ({openCount})
            </FilterChip>
          ))}
        </div>
      )}

      {alertsQuery.isError && <FormBanner>We couldn&apos;t load delivery alerts.</FormBanner>}
      {alertsQuery.isPending && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading delivery alerts">
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}
      {!alertsQuery.isPending && !alertsQuery.isError && alerts.length === NO_ALERTS && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {status === "OPEN" ? "Nothing needs attention right now." : "No resolved alerts yet."}
        </p>
      )}
      {alerts.length > NO_ALERTS && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <LogisticsAlertRow
                alert={alert}
                canResolve={canResolve}
                onResolve={setAlertToResolve}
              />
            </li>
          ))}
        </ul>
      )}
      {alertsQuery.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void alertsQuery.fetchNextPage()}
          isLoading={alertsQuery.isFetchingNextPage}
        >
          Show more alerts
        </Button>
      )}

      <TextPromptModal
        open={alertToResolve !== null}
        title="Resolve this alert"
        description="Say what you did, so the rest of the team knows."
        label="What you did"
        validate={(trimmedNote) =>
          trimmedNote.length < MIN_NOTE_LENGTH ? "Write a few words about what you did." : null
        }
        confirmLabel="Resolve"
        pendingLabel="Resolving…"
        isPending={resolveAlert.isPending}
        onConfirm={(note) => {
          if (!alertToResolve) return;
          resolveAlert.mutate(
            { alertId: alertToResolve.id, note },
            { onSuccess: () => setAlertToResolve(null) },
          );
        }}
        onCancel={() => setAlertToResolve(null)}
      />
    </div>
  );
};
