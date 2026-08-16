import { Shirt } from "lucide-react";

import { CommissionSource, type CreatorCommission } from "../api/commissionSchemas";
import { CommissionStatusBadge } from "./CommissionStatusBadge";

const SOURCE_LABEL: Record<CreatorCommission["source"], string> = {
  [CommissionSource.TAG_CLICK]: "via tagged post",
  [CommissionSource.INTERNAL_LINK]: "via your link",
  [CommissionSource.EXTERNAL_LINK]: "via shared link",
};

type EarningsLedgerRowProps = {
  commission: CreatorCommission;
};

export const EarningsLedgerRow = ({ commission }: EarningsLedgerRowProps) => {
  const { productName, brandName, imageUrl, source, status, amount, createdAt } = commission;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border p-4">
      <div
        className="flex aspect-3/4 w-14 shrink-0 items-center justify-center rounded-lg bg-muted bg-cover bg-center"
        style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : undefined }}
      >
        {!imageUrl && <Shirt className="size-6 text-foreground/25" strokeWidth={1} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{productName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {brandName} · {SOURCE_LABEL[source]} · {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="font-display text-sm font-bold text-foreground">
          Rs. {amount.toLocaleString()}
        </p>
        <CommissionStatusBadge status={status} />
      </div>
    </div>
  );
};
