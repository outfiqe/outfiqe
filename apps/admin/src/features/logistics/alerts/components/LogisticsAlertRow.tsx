import { Button } from "@outfiqe/design-system";
import { LOGISTICS_ALERT_LABELS } from "@outfiqe/utils";
import { Link } from "@tanstack/react-router";

import type { LogisticsAlert } from "../api/alertsSchemas";
import { formatAlertTime } from "../utils/alert.utils";

type LogisticsAlertRowProps = {
  alert: LogisticsAlert;
  canResolve: boolean;
  onResolve: (alert: LogisticsAlert) => void;
};

const AlertSubjectLink = ({ alert }: { alert: LogisticsAlert }) => {
  if (alert.shipmentId) {
    return (
      <Link
        to="/logistics/parcels/$shipmentId"
        params={{ shipmentId: alert.shipmentId }}
        className="font-mono text-sm text-foreground underline-offset-2 hover:underline"
      >
        {alert.trackingCode ?? "Open parcel"}
      </Link>
    );
  }
  if (alert.orderId) {
    return (
      <Link
        to="/orders/$orderId"
        params={{ orderId: alert.orderId }}
        className="text-sm text-foreground underline-offset-2 hover:underline"
      >
        Open order
      </Link>
    );
  }
  return null;
};

export const LogisticsAlertRow = ({ alert, canResolve, onResolve }: LogisticsAlertRowProps) => {
  const place = [alert.brandName, alert.hubName].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 p-4">
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-foreground">{LOGISTICS_ALERT_LABELS[alert.alertType]}</p>
        <p className="text-sm text-muted-foreground">
          {place ? `${place} · ` : ""}raised {formatAlertTime(alert.raisedAt)}
        </p>
        {alert.detail && <p className="text-sm text-muted-foreground">{alert.detail}</p>}
        {alert.resolvedAt && (
          <p className="text-sm text-muted-foreground">
            {alert.isAutoResolved
              ? `Cleared on its own ${formatAlertTime(alert.resolvedAt)}`
              : `Resolved by ${alert.resolvedByName ?? "a removed account"}: ${alert.resolutionNote ?? ""}`}
          </p>
        )}
        <AlertSubjectLink alert={alert} />
      </div>
      {canResolve && !alert.resolvedAt && (
        <Button size="sm" variant="outline" onClick={() => onResolve(alert)}>
          Resolve
        </Button>
      )}
    </div>
  );
};
