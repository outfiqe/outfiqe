import { Button, FormBanner, Input, Select } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { type UpdateWithdrawPolicyInput, withdrawPolicyApi } from "./api";
import { type OwnerTypeValue, type WindowTypeValue, type WithdrawPolicy } from "./schemas";

const OWNER_TABS: OwnerTypeValue[] = ["CREATOR", "BUSINESS"];
const OWNER_TAB_LABEL: Record<OwnerTypeValue, string> = {
  CREATOR: "Creator",
  BUSINESS: "Business",
};
const WINDOW_TYPES: WindowTypeValue[] = ["MONTHLY", "WEEKLY", "CUSTOM_DAYS"];

type PolicyFormState = {
  minAmount: string;
  maxAmount: string;
  windowType: WindowTypeValue;
  windowValue: string;
  maxAttemptsPerWindow: string;
  cooldownAfterRejectionDays: string;
  processingNoteText: string;
};

const formForPolicy = (policy: WithdrawPolicy): PolicyFormState => ({
  minAmount: String(policy.minAmount),
  maxAmount: String(policy.maxAmount),
  windowType: policy.windowType,
  windowValue: String(policy.windowValue),
  maxAttemptsPerWindow: String(policy.maxAttemptsPerWindow),
  cooldownAfterRejectionDays: String(policy.cooldownAfterRejectionDays),
  processingNoteText: policy.processingNoteText,
});

const toUpdateInput = (
  ownerType: OwnerTypeValue,
  form: PolicyFormState,
): UpdateWithdrawPolicyInput => ({
  ownerType,
  minAmount: Number(form.minAmount),
  maxAmount: Number(form.maxAmount),
  windowType: form.windowType,
  windowValue: Number(form.windowValue),
  maxAttemptsPerWindow: Number(form.maxAttemptsPerWindow),
  cooldownAfterRejectionDays: Number(form.cooldownAfterRejectionDays),
  processingNoteText: form.processingNoteText,
});

const PolicyForm = ({ ownerType }: { ownerType: OwnerTypeValue }) => {
  const queryClient = useQueryClient();
  const queryKey = ["withdraw-policy", ownerType];

  const { data: policy, isLoading } = useQuery({
    queryKey,
    queryFn: () => withdrawPolicyApi.get(ownerType),
  });

  const [form, setForm] = useState<PolicyFormState | null>(null);
  const activeForm = form ?? (policy ? formForPolicy(policy) : null);

  const update = useMutation({
    mutationFn: (input: UpdateWithdrawPolicyInput) => withdrawPolicyApi.update(input),
    onSuccess: (updatedPolicy) => {
      queryClient.setQueryData(queryKey, updatedPolicy);
      setForm(formForPolicy(updatedPolicy));
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!activeForm) return;
    update.mutate(toUpdateInput(ownerType, activeForm));
  };

  if (isLoading || !activeForm) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-xs text-muted-foreground">Min amount (Rs.)</label>
          <Input
            type="number"
            required
            min={0}
            value={activeForm.minAmount}
            onChange={(e) => setForm({ ...activeForm, minAmount: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-muted-foreground">Max amount (Rs.)</label>
          <Input
            type="number"
            required
            min={1}
            value={activeForm.maxAmount}
            onChange={(e) => setForm({ ...activeForm, maxAmount: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-muted-foreground">Window type</label>
          <Select
            value={activeForm.windowType}
            onChange={(e) =>
              setForm({ ...activeForm, windowType: e.target.value as WindowTypeValue })
            }
          >
            {WINDOW_TYPES.map((windowType) => (
              <option key={windowType} value={windowType}>
                {windowType}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-muted-foreground">
            Window value (days before month end / every N days)
          </label>
          <Input
            type="number"
            required
            min={1}
            value={activeForm.windowValue}
            onChange={(e) => setForm({ ...activeForm, windowValue: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-muted-foreground">Attempts per window</label>
          <Input
            type="number"
            required
            min={1}
            value={activeForm.maxAttemptsPerWindow}
            onChange={(e) => setForm({ ...activeForm, maxAttemptsPerWindow: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-muted-foreground">
            Cooldown after rejection (days)
          </label>
          <Input
            type="number"
            required
            min={0}
            value={activeForm.cooldownAfterRejectionDays}
            onChange={(e) => setForm({ ...activeForm, cooldownAfterRejectionDays: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">Processing note</label>
        <Input
          required
          value={activeForm.processingNoteText}
          onChange={(e) => setForm({ ...activeForm, processingNoteText: e.target.value })}
        />
      </div>

      {update.isError && <FormBanner>{getErrorMessage(update.error)}</FormBanner>}

      <Button type="submit" disabled={update.isPending}>
        {update.isPending ? "Saving…" : "Save policy"}
      </Button>
    </form>
  );
};

export const WithdrawPolicyPage = () => {
  const [ownerType, setOwnerType] = useState<OwnerTypeValue>("CREATOR");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Withdrawal policy</h1>

      <div className="flex flex-wrap gap-2">
        {OWNER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setOwnerType(tab)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              ownerType === tab
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {OWNER_TAB_LABEL[tab]}
          </button>
        ))}
      </div>

      <PolicyForm key={ownerType} ownerType={ownerType} />
    </div>
  );
};
