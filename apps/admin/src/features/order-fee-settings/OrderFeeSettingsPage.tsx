import { Button, FormBanner, Input } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { orderFeeSettingsApi, type UpdateOrderFeeSettingsInput } from "./api";
import {
  ORDER_FEE_SETTINGS_HISTORY_QUERY_KEY,
  useOrderFeeSettingsHistory,
} from "./hooks/useOrderFeeSettingsHistory";
import type { OrderFeeSettings } from "./schemas";

const SETTINGS_QUERY_KEY = ["order-fee-settings"];

type FeeFormState = {
  standardDeliveryFee: string;
  freeDeliveryThreshold: string;
  codHandlingFee: string;
};

const formForSettings = (settings: OrderFeeSettings): FeeFormState => ({
  standardDeliveryFee: String(settings.standardDeliveryFee),
  freeDeliveryThreshold: String(settings.freeDeliveryThreshold),
  codHandlingFee: String(settings.codHandlingFee),
});

const toUpdateInput = (form: FeeFormState): UpdateOrderFeeSettingsInput => ({
  standardDeliveryFee: Number(form.standardDeliveryFee),
  freeDeliveryThreshold: Number(form.freeDeliveryThreshold),
  codHandlingFee: Number(form.codHandlingFee),
});

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

const OrderFeeSettingsForm = ({
  settings,
  onSaved,
}: {
  settings: OrderFeeSettings;
  onSaved: (updated: OrderFeeSettings) => void;
}) => {
  const [form, setForm] = useState<FeeFormState>(() => formForSettings(settings));
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (input: UpdateOrderFeeSettingsInput) => orderFeeSettingsApi.update(input),
    onSuccess: (updated) => {
      setForm(formForSettings(updated));
      setError(null);
      onSaved(updated);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(toUpdateInput(form));
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <label className="block text-xs text-muted-foreground">Standard delivery fee (Rs.)</label>
          <Input
            type="number"
            required
            min={0}
            value={form.standardDeliveryFee}
            onChange={(e) => setForm({ ...form, standardDeliveryFee: e.target.value })}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-muted-foreground">
            Free delivery threshold (Rs.)
          </label>
          <Input
            type="number"
            required
            min={0}
            value={form.freeDeliveryThreshold}
            onChange={(e) => setForm({ ...form, freeDeliveryThreshold: e.target.value })}
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-muted-foreground">COD handling fee (Rs.)</label>
          <Input
            type="number"
            required
            min={0}
            value={form.codHandlingFee}
            onChange={(e) => setForm({ ...form, codHandlingFee: e.target.value })}
            className="w-36"
          />
        </div>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
      {error && <FormBanner className="mt-3">{error}</FormBanner>}
    </>
  );
};

export const OrderFeeSettingsPage = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: orderFeeSettingsApi.get,
  });

  const handleSaved = (updated: OrderFeeSettings) => {
    queryClient.setQueryData(SETTINGS_QUERY_KEY, updated);
    void queryClient.invalidateQueries({ queryKey: ORDER_FEE_SETTINGS_HISTORY_QUERY_KEY });
  };

  const {
    data: historyQuery,
    isLoading: isHistoryLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useOrderFeeSettingsHistory();
  const historyEntries = historyQuery?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Order fees</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Delivery and cash-on-delivery fees applied at checkout.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {settings && <OrderFeeSettingsForm settings={settings} onSaved={handleSaved} />}

      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Change history</h2>
        <div className="mt-4 space-y-2">
          {isHistoryLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isHistoryLoading && historyEntries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No changes yet — these are the original values.
            </p>
          )}

          {historyEntries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-foreground">
                {entry.changedByName} changed the fees on {formatDateTime(entry.createdAt)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Delivery Rs. {entry.oldValues.standardDeliveryFee} → Rs.{" "}
                {entry.newValues.standardDeliveryFee} · Free delivery over Rs.{" "}
                {entry.oldValues.freeDeliveryThreshold} → Rs.{" "}
                {entry.newValues.freeDeliveryThreshold} · COD fee Rs.{" "}
                {entry.oldValues.codHandlingFee} → Rs. {entry.newValues.codHandlingFee}
              </p>
            </div>
          ))}

          {hasNextPage && (
            <Button
              variant="outline"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mx-auto"
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
