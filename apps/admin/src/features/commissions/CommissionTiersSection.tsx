import { Button, FormBanner, Input, Modal } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { commissionsApi, type CreateTierInput, type UpdateTierInput } from "./api";
import type { CommissionTier } from "./schemas";

const TIERS_QUERY_KEY = ["admin-commission-tiers"];

type TierFormState = {
  minPrice: string;
  maxPrice: string;
  amount: string;
  sortOrder: string;
};

const EMPTY_FORM: TierFormState = { minPrice: "", maxPrice: "", amount: "", sortOrder: "" };

const toTierInput = (form: TierFormState): CreateTierInput => ({
  minPrice: Number(form.minPrice),
  amount: Number(form.amount),
  ...(form.maxPrice ? { maxPrice: Number(form.maxPrice) } : {}),
  ...(form.sortOrder ? { sortOrder: Number(form.sortOrder) } : {}),
});

const TierFields = ({
  form,
  onChange,
}: {
  form: TierFormState;
  onChange: (form: TierFormState) => void;
}) => (
  <div className="flex flex-wrap items-end gap-3">
    <div className="space-y-1.5">
      <label className="block text-xs text-muted-foreground">Min price (Rs.)</label>
      <Input
        type="number"
        required
        min={0}
        value={form.minPrice}
        onChange={(e) => onChange({ ...form, minPrice: e.target.value })}
        className="w-32"
      />
    </div>
    <div className="space-y-1.5">
      <label className="block text-xs text-muted-foreground">Max price (Rs.)</label>
      <Input
        type="number"
        min={0}
        placeholder="No limit"
        value={form.maxPrice}
        onChange={(e) => onChange({ ...form, maxPrice: e.target.value })}
        className="w-32"
      />
    </div>
    <div className="space-y-1.5">
      <label className="block text-xs text-muted-foreground">Commission (Rs.)</label>
      <Input
        type="number"
        required
        min={1}
        value={form.amount}
        onChange={(e) => onChange({ ...form, amount: e.target.value })}
        className="w-28"
      />
    </div>
    <div className="space-y-1.5">
      <label className="block text-xs text-muted-foreground">Sort order</label>
      <Input
        type="number"
        value={form.sortOrder}
        onChange={(e) => onChange({ ...form, sortOrder: e.target.value })}
        className="w-24"
      />
    </div>
  </div>
);

const formForTier = (tier: CommissionTier): TierFormState => ({
  minPrice: String(tier.minPrice),
  maxPrice: tier.maxPrice === null ? "" : String(tier.maxPrice),
  amount: String(tier.amount),
  sortOrder: String(tier.sortOrder),
});

const EditTierModal = ({ tier, onClose }: { tier: CommissionTier; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TierFormState>(() => formForTier(tier));
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (input: UpdateTierInput) => commissionsApi.updateTier(tier.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIERS_QUERY_KEY });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(toTierInput(form));
  };

  return (
    <Modal open onClose={onClose} title="Edit commission tier">
      <form onSubmit={handleSubmit} className="space-y-4">
        <TierFields form={form} onChange={setForm} />
        {error && <FormBanner>{error}</FormBanner>}
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Modal>
  );
};

export const CommissionTiersSection = () => {
  const queryClient = useQueryClient();
  const { data: tiers, isLoading } = useQuery({
    queryKey: TIERS_QUERY_KEY,
    queryFn: commissionsApi.listTiers,
  });

  const [form, setForm] = useState<TierFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<CommissionTier | null>(null);

  const create = useMutation({
    mutationFn: () => commissionsApi.createTier(toTierInput(form)),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setError(null);
      queryClient.invalidateQueries({ queryKey: TIERS_QUERY_KEY });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => commissionsApi.deleteTier(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIERS_QUERY_KEY }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  const handleDelete = (tier: CommissionTier) => {
    if (window.confirm(`Delete the Rs. ${tier.amount} tier?`)) remove.mutate(tier.id);
  };

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Commission tiers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Fixed commission a creator earns per attributed sale, by the sold item&apos;s price band.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <TierFields form={form} onChange={setForm} />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Add tier"}
        </Button>
      </form>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {tiers?.length === 0 && <p className="text-sm text-muted-foreground">No tiers yet.</p>}

        {tiers?.map((tier) => (
          <div
            key={tier.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <p className="text-sm text-foreground">
              Rs. {tier.minPrice.toLocaleString()}
              {tier.maxPrice === null ? "+" : ` – Rs. ${tier.maxPrice.toLocaleString()}`} → Rs.{" "}
              {tier.amount.toLocaleString()} commission
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingTier(tier)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(tier)}
                disabled={remove.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editingTier && (
        <EditTierModal
          key={editingTier.id}
          tier={editingTier}
          onClose={() => setEditingTier(null)}
        />
      )}
    </div>
  );
};
