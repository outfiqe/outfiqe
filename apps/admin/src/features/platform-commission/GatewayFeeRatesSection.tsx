import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Skeleton,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";

import { platformCommissionApi } from "./api";
import { gatewayRateFormSchema, type GatewayRateFormValues } from "./gatewayRateForm.schema";
import type { GatewayPaymentMethodValue } from "./schemas";

const RATES_QUERY_KEY = ["admin-gateway-fee-rates"];
const PROVIDERS: GatewayPaymentMethodValue[] = ["ESEWA", "KHALTI"];
const PROVIDER_LABEL: Record<GatewayPaymentMethodValue, string> = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
};

const ProviderRateForm = ({ paymentMethod }: { paymentMethod: GatewayPaymentMethodValue }) => {
  const { data: rates, isLoading: isRatesLoading } = useQuery({
    queryKey: RATES_QUERY_KEY,
    queryFn: platformCommissionApi.listGatewayFeeRates,
  });
  const activeRate = rates?.find((rate) => rate.paymentMethod === paymentMethod && rate.isActive);

  const form = useForm<GatewayRateFormValues>({
    resolver: zodResolver(gatewayRateFormSchema),
    defaultValues: { ratePercent: "" },
    mode: "onTouched",
  });

  const createRate = useApiMutation({
    mutationFn: (values: GatewayRateFormValues) =>
      platformCommissionApi.createGatewayFeeRate({
        paymentMethod,
        ratePercent: Number(values.ratePercent),
      }),
    invalidateKeys: [RATES_QUERY_KEY],
    successMessage: `${PROVIDER_LABEL[paymentMethod]} fee estimate updated.`,
    onSuccess: () => form.reset({ ratePercent: "" }),
  });

  const submitRate = form.handleSubmit((values) => createRate.mutate(values));

  return (
    <Form {...form}>
      <form
        onSubmit={submitRate}
        noValidate
        className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div>
          <h3 className="font-display text-sm font-bold text-foreground">
            {PROVIDER_LABEL[paymentMethod]}
          </h3>
          {isRatesLoading ? (
            <Skeleton role="status" aria-label="Loading current rate" className="mt-1 h-4 w-40" />
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {activeRate
                ? `Current estimate: ${activeRate.ratePercent}%`
                : "No rate configured yet."}
            </p>
          )}
        </div>
        <FormField
          control={form.control}
          name="ratePercent"
          render={({ field }) => (
            <FormItem className="w-28 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">
                New rate (%)
              </FormLabel>
              <FormControl>
                <Input inputMode="decimal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" isLoading={createRate.isPending} className="mt-[22px]">
          Update
        </Button>
        {createRate.isError && (
          <FormBanner className="w-full">{getErrorMessage(createRate.error)}</FormBanner>
        )}
      </form>
    </Form>
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
