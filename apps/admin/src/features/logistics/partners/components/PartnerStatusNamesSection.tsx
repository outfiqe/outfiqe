import { Button, Input, Select } from "@outfiqe/design-system";
import { X } from "lucide-react";
import { useState } from "react";

import { PARCEL_EVENT_CODE_LABELS } from "../../shipments/constants/parcelLabels";
import {
  type DeliveryPartner,
  PARTNER_STATUS_CODES,
  type PartnerStatusCode,
  partnerStatusCodeSchema,
} from "../api/partnersSchemas";
import { useSavePartnerStatusMap } from "../hooks/useSavePartnerStatusMap";

const [DEFAULT_STATUS_CODE] = PARTNER_STATUS_CODES;
const MAX_RAW_STATUS_LENGTH = 120;

type StatusNameRow = { rowId: string; rawStatus: string; canonicalCode: PartnerStatusCode };

const toRows = (partner: DeliveryPartner): StatusNameRow[] =>
  partner.statusMappings.map(({ rawStatus, canonicalCode }) => ({
    rowId: crypto.randomUUID(),
    rawStatus,
    canonicalCode,
  }));

type PartnerStatusNamesSectionProps = { partner: DeliveryPartner; canManage: boolean };

export const PartnerStatusNamesSection = ({
  partner,
  canManage,
}: PartnerStatusNamesSectionProps) => {
  const saveStatusMap = useSavePartnerStatusMap(partner.id);
  const [rows, setRows] = useState<StatusNameRow[]>(() => toRows(partner));

  const updateRow = (rowId: string, change: Partial<StatusNameRow>) =>
    setRows((current) => current.map((row) => (row.rowId === rowId ? { ...row, ...change } : row)));

  const addRow = () =>
    setRows((current) => [
      ...current,
      { rowId: crypto.randomUUID(), rawStatus: "", canonicalCode: DEFAULT_STATUS_CODE },
    ]);

  const saveRows = () =>
    saveStatusMap.mutate(
      rows
        .filter(({ rawStatus }) => rawStatus.trim() !== "")
        .map(({ rawStatus, canonicalCode }) => ({ rawStatus: rawStatus.trim(), canonicalCode })),
    );

  return (
    <section aria-labelledby="partner-status-names-heading" className="space-y-3">
      <h2 id="partner-status-names-heading" className="text-lg font-semibold text-foreground">
        Their status names
      </h2>
      <p className="text-sm text-muted-foreground">
        Write each status exactly as the partner sends it. Updates with a status not listed here are
        saved but don&apos;t move the parcel.
      </p>
      <ul className="space-y-2">
        {rows.map(({ rowId, rawStatus, canonicalCode }) => (
          <li key={rowId} className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="Partner's status"
              className="min-w-48 flex-1"
              value={rawStatus}
              maxLength={MAX_RAW_STATUS_LENGTH}
              disabled={!canManage}
              onChange={(event) => updateRow(rowId, { rawStatus: event.target.value })}
            />
            <Select
              aria-label="Means"
              className="w-56"
              value={canonicalCode}
              disabled={!canManage}
              onChange={(event) => {
                const parsedCode = partnerStatusCodeSchema.safeParse(event.target.value);
                if (parsedCode.success) updateRow(rowId, { canonicalCode: parsedCode.data });
              }}
            >
              {PARTNER_STATUS_CODES.map((statusCode) => (
                <option key={statusCode} value={statusCode}>
                  {PARCEL_EVENT_CODE_LABELS[statusCode]}
                </option>
              ))}
            </Select>
            {canManage && (
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((row) => row.rowId !== rowId))}
                className="cursor-pointer rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${rawStatus || "this status"}`}
              >
                <X className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canManage && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={addRow}>
            Add a status
          </Button>
          <Button onClick={saveRows} isLoading={saveStatusMap.isPending}>
            Save status names
          </Button>
        </div>
      )}
    </section>
  );
};
