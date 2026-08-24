import { Button, FormBanner, Input } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { platformCommissionApi } from "./api";
import type { GatewayPaymentMethodValue } from "./schemas";

const RATES_QUERY_KEY = ["admin-gateway-fee-rates"];
const PROVIDERS: GatewayPaymentMethodValue[] = ["ESEWA", "KHALTI"];
const PROVIDER_LABEL: Record<GatewayPaymentMethodValue, string> = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
};

const ProviderRateForm = ({ paymentMethod }: { paymentMethod: GatewayPaymentMethodValue }) => {
  const queryClient = useQueryClient();
  const { data: rates } = useQuery({
    queryKey: RATES_QUERY_KEY,
    queryFn: platformCommissionApi.listGatewayFeeRates,
  });
  const activeRate = rates?.find((rate) => rate.paymentMethod === paymentMethod && rate.isActive);

  const [ratePercent, setRatePercent] = useState("");

  const createRate = useMutation({
    mutationFn: () =>
      platformCommissionApi.createGatewayFeeRate({
        paymentMethod,
        ratePercent: Number(ratePercent),
      }),
    onSuccess: () => {
      setRatePercent("");
      queryClient.invalidateQueries({ queryKey: RATES_QUERY_KEY });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createRate.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">
          {PROVIDER_LABEL[paymentMethod]}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {activeRate ? `Current estimate: ${activeRate.ratePercent}%` : "No rate configured yet."}
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">New rate (%)</label>
        <Input
          type="number"
          required
          min={0}
          step={0.01}
          value={ratePercent}
          onChange={(e) => setRatePercent(e.target.value)}
          className="w-24"
        />
      </div>
      <Button type="submit" size="sm" disabled={createRate.isPending}>
        {createRate.isPending ? "Saving…" : "Update"}
      </Button>
      {createRate.isError && (
        <FormBanner className="w-full">{getErrorMessage(createRate.error)}</FormBanner>
      )}
    </form>
  );
};

export const GatewayFeeRatesSection = () => {
  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Gateway fee estimates</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The per-transaction processor fee estimate deducted alongside the platform commission for
        non-cash payments. Cash on delivery never carries a gateway fee.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {PROVIDERS.map((paymentMethod) => (
          <ProviderRateForm key={paymentMethod} paymentMethod={paymentMethod} />
        ))}
      </div>
    </div>
  );
};
