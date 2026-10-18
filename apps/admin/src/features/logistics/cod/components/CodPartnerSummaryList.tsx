import { Badge, cn } from "@outfiqe/design-system";

import type { CodPartnerSummary } from "../api/codSchemas";
import { formatCashAmount, formatCashDate } from "../utils/codRemittance.utils";

const NO_OVERDUE_PARCELS = 0;

type CodPartnerSummaryListProps = {
  partners: CodPartnerSummary[];
  selectedPartnerId: string | null;
  onSelectPartner: (partnerId: string) => void;
};

export const CodPartnerSummaryList = ({
  partners,
  selectedPartnerId,
  onSelectPartner,
}: CodPartnerSummaryListProps) => (
  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {partners.map((partner) => {
      const isSelected = partner.partnerId === selectedPartnerId;
      const hasOverdueCash = partner.overdueParcelCount > NO_OVERDUE_PARCELS;
      return (
        <li key={partner.partnerId}>
          <button
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelectPartner(partner.partnerId)}
            className={cn(
              "w-full cursor-pointer rounded-xl border bg-card p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected ? "border-primary" : "border-border hover:border-foreground/30",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-foreground">{partner.partnerName}</p>
              {hasOverdueCash && (
                <Badge tone="negative" showDot={false}>
                  {partner.overdueParcelCount} overdue
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {formatCashAmount(partner.unremittedAmount)}
            </p>
            <p className="text-sm text-muted-foreground">
              {partner.unremittedParcelCount} parcels not paid in · oldest delivered{" "}
              {formatCashDate(partner.oldestDeliveredAt)}
            </p>
            {hasOverdueCash && (
              <p className="text-sm text-muted-foreground">
                {formatCashAmount(partner.overdueAmount)} is past the {partner.codRemittanceDays}
                -day limit
              </p>
            )}
          </button>
        </li>
      );
    })}
  </ul>
);
