import { Badge, Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import { useDeactivateRiderPayRate } from "../hooks/useDeactivateRiderPayRate";
import { useRiderPayRates } from "../hooks/useRiderPayRates";
import { formatPayAmount, formatPayDate } from "../utils/riderPay.utils";
import { RiderPayRateModal } from "./RiderPayRateModal";

const NO_RATES = 0;

type RiderPayRateSectionProps = { countryCode: string; canManage: boolean };

export const RiderPayRateSection = ({ countryCode, canManage }: RiderPayRateSectionProps) => {
  const { data: payRates, isPending, isError } = useRiderPayRates(countryCode);
  const deactivateRate = useDeactivateRiderPayRate();
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);

  if (isError) return <FormBanner>We couldn&apos;t load rider pay rates.</FormBanner>;
  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading pay rates">
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const { rateInEffect, rates } = payRates;

  return (
    <section className="space-y-4" aria-labelledby="rider-pay-rate-heading">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="rider-pay-rate-heading" className="text-lg font-semibold text-foreground">
              Contractor pay now
            </h2>
            <p className="mt-1 text-sm text-foreground">
              {formatPayAmount(rateInEffect.visitAmount)} per visit ·{" "}
              {formatPayAmount(rateInEffect.extraStopAmount)} per extra bag ·{" "}
              {formatPayAmount(rateInEffect.wastedVisitAmount)} for a wasted visit
            </p>
            {rateInEffect.isDefault && (
              <p className="mt-1 text-xs text-muted-foreground">
                This is the launch default. Set a rate to change it.
              </p>
            )}
          </div>
          {canManage && <Button onClick={() => setIsRateModalOpen(true)}>Change pay</Button>}
        </div>
      </div>

      {deactivateRate.isError && (
        <FormBanner>We couldn&apos;t switch that rate off. Try again.</FormBanner>
      )}
      {rates.length === NO_RATES ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No rate has been set yet, so riders are paid the launch default.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rates.map((rate) => (
            <li key={rate.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {formatPayAmount(rate.visitAmount)} · {formatPayAmount(rate.extraStopAmount)} ·{" "}
                  {formatPayAmount(rate.wastedVisitAmount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  From {formatPayDate(rate.effectiveFrom)} · set by{" "}
                  {rate.createdByName ?? "a removed account"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={rate.isActive ? "positive" : "neutral"} showDot={false}>
                  {rate.isActive ? "On" : "Switched off"}
                </Badge>
                {canManage && rate.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deactivateRate.mutate(rate.id)}
                    isLoading={deactivateRate.isPending && deactivateRate.variables === rate.id}
                  >
                    Switch off
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isRateModalOpen && (
        <RiderPayRateModal payRates={payRates} onClose={() => setIsRateModalOpen(false)} />
      )}
    </section>
  );
};
