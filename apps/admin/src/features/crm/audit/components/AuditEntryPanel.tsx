import { Drawer, DrawerScrollArea } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";

import { MetricRow } from "@/components/MetricParts";

import { formatDateTime, toPlainWords } from "../../utils/format.utils";
import { AUDIT_TARGET_LINKS } from "../constants/auditLabels";
import { type AuditLogRow, toAuditActionLabel, toAuditSummary } from "../utils/auditEntries.utils";

const SINGLE_OCCURRENCE = 1;

const toWords = (metadataKey: string) => toPlainWords(metadataKey.replace(/([A-Z])/g, "_$1"));

const toSimpleDetails = (metadata: Record<string, unknown>) =>
  Object.entries(metadata).filter(
    (detail): detail is [string, string | number] =>
      typeof detail[1] === "string" || typeof detail[1] === "number",
  );

export const AuditEntryPanel = ({
  entry,
  onClose,
}: {
  entry: AuditLogRow;
  onClose: () => void;
}) => {
  const { action, summary, actorName, createdAt, outcome, ipAddress, metadata } = entry;
  const targetLink = entry.targetType ? AUDIT_TARGET_LINKS[entry.targetType] : undefined;

  return (
    <Drawer
      open
      onClose={onClose}
      title={toAuditActionLabel(action)}
      footer={
        targetLink && (
          <div className="px-5 py-3">
            <Link
              to={targetLink.to}
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              {targetLink.label}
            </Link>
          </div>
        )
      }
    >
      <DrawerScrollArea className="p-5">
        <p className="text-sm text-foreground">{toAuditSummary(summary)}</p>
        <div className="mt-4">
          <MetricRow label="Who" value={actorName ?? "System"} />
          <MetricRow label="When" value={formatDateTime(createdAt)} />
          <MetricRow label="Result" value={outcome === "FAILURE" ? "Failed" : "Done"} />
          {entry.occurrenceCount > SINGLE_OCCURRENCE && (
            <MetricRow label="Happened" value={`${entry.occurrenceCount} times in a row`} />
          )}
          {ipAddress && <MetricRow label="From address" value={ipAddress} />}
          {toSimpleDetails(metadata).map(([detailKey, detailValue]) => (
            <MetricRow
              key={detailKey}
              label={toWords(detailKey)}
              hasLongValue
              value={String(detailValue)}
            />
          ))}
        </div>
      </DrawerScrollArea>
    </Drawer>
  );
};
