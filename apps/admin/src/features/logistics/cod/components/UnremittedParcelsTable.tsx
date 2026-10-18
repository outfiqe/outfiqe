import { Badge, Checkbox, Input, Table, type TableColumn } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";

import type { UnremittedParcel } from "../api/codSchemas";
import {
  formatCashAmount,
  formatCashDate,
  type PartnerFeeByShipmentId,
} from "../utils/codRemittance.utils";

const MIN_PARTNER_FEE = 0;

type UnremittedParcelsTableProps = {
  parcels: UnremittedParcel[];
  isLoading: boolean;
  canTick: boolean;
  feeByShipmentId: PartnerFeeByShipmentId;
  onToggleParcel: (parcel: UnremittedParcel) => void;
  onChangeFee: (shipmentId: string, partnerFee: number) => void;
};

export const UnremittedParcelsTable = ({
  parcels,
  isLoading,
  canTick,
  feeByShipmentId,
  onToggleParcel,
  onChangeFee,
}: UnremittedParcelsTableProps) => {
  const tickColumn: TableColumn<UnremittedParcel> = {
    key: "tick",
    header: "Paid in",
    render: (parcel) => (
      <Checkbox
        checked={parcel.shipmentId in feeByShipmentId}
        aria-label={`Include parcel ${parcel.trackingCode}`}
        onChange={() => onToggleParcel(parcel)}
      />
    ),
  };
  const feeColumn: TableColumn<UnremittedParcel> = {
    key: "fee",
    header: "Partner fee",
    align: "right",
    render: (parcel) => (
      <Input
        type="number"
        inputMode="numeric"
        min={MIN_PARTNER_FEE}
        max={parcel.collectedAmount}
        disabled={!(parcel.shipmentId in feeByShipmentId)}
        aria-label={`Partner fee for parcel ${parcel.trackingCode}`}
        value={feeByShipmentId[parcel.shipmentId] ?? ""}
        onChange={(event) => onChangeFee(parcel.shipmentId, Number(event.target.value))}
        className="ml-auto w-28"
      />
    ),
  };
  const parcelColumns: TableColumn<UnremittedParcel>[] = [
    {
      key: "parcel",
      header: "Parcel",
      render: ({ shipmentId, trackingCode, partnerReference }) => (
        <div>
          <Link
            to="/logistics/parcels/$shipmentId"
            params={{ shipmentId }}
            className="font-mono text-foreground underline-offset-2 hover:underline"
          >
            {trackingCode}
          </Link>
          <p className="text-xs text-muted-foreground">{partnerReference ?? "No partner ID"}</p>
        </div>
      ),
    },
    {
      key: "cash",
      header: "Cash collected",
      render: ({ collectedAmount, expectedAmount, hasCashMismatch }) => (
        <div className="space-y-1">
          <p className="text-foreground">{formatCashAmount(collectedAmount)}</p>
          {hasCashMismatch && (
            <Badge tone="negative" showDot={false}>
              Label said {formatCashAmount(expectedAmount)}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "delivered",
      header: "Delivered",
      render: ({ deliveredAt, remitBy, isOverdue }) => (
        <div>
          <p className="text-foreground">{formatCashDate(deliveredAt)}</p>
          <p className={isOverdue ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {isOverdue ? "Overdue since" : "Due by"} {formatCashDate(remitBy)}
          </p>
        </div>
      ),
    },
  ];

  return (
    <Table
      caption="Delivered cash parcels the partner hasn't paid in yet"
      columns={canTick ? [tickColumn, ...parcelColumns, feeColumn] : parcelColumns}
      rows={parcels}
      rowKey={({ shipmentId }) => shipmentId}
      isLoading={isLoading}
      emptyState="Every delivered cash parcel from this partner has been paid in."
    />
  );
};
