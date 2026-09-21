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
  Modal,
  toast,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { ActionRowSkeleton } from "@/components/ActionRowSkeleton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { getErrorMessage } from "@/lib/errorMessages";

import { commissionsApi, type CreateTierInput, type UpdateTierInput } from "./api";
import type { CommissionTier } from "./schemas";
import { EMPTY_TIER_FORM, tierFormSchema, type TierFormValues } from "./tierForm.schema";

const TIERS_QUERY_KEY = ["admin-commission-tiers"];

const LABEL_CLASS = "text-xs font-normal text-muted-foreground";

const toTierInput = (values: TierFormValues): CreateTierInput => ({
  minPrice: Number(values.minPrice),
  amount: Number(values.amount),
  ...(values.maxPrice ? { maxPrice: Number(values.maxPrice) } : {}),
  ...(values.sortOrder ? { sortOrder: Number(values.sortOrder) } : {}),
});

const formValuesForTier = (tier: CommissionTier): TierFormValues => ({
  minPrice: String(tier.minPrice),
  maxPrice: tier.maxPrice === null ? "" : String(tier.maxPrice),
  amount: String(tier.amount),
  sortOrder: String(tier.sortOrder),
});

type TierFieldName = "minPrice" | "maxPrice" | "amount" | "sortOrder";

const TierFields = ({ form }: { form: UseFormReturn<TierFormValues> }) => {
  const tierField = (
    name: TierFieldName,
    label: string,
    widthClass: string,
    placeholder?: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={`${widthClass} space-y-1.5`}>
          <FormLabel className={LABEL_CLASS}>{label}</FormLabel>
          <FormControl>
            <Input inputMode="numeric" placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <div className="flex flex-wrap items-start gap-3">
      {tierField("minPrice", "Min price (Rs.)", "w-32")}
      {tierField("maxPrice", "Max price (Rs.)", "w-32", "No limit")}
      {tierField("amount", "Commission (Rs.)", "w-28")}
      {tierField("sortOrder", "Sort order", "w-24")}
    </div>
  );
};

const EditTierModal = ({ tier, onClose }: { tier: CommissionTier; onClose: () => void }) => {
  const form = useForm<TierFormValues>({
    resolver: zodResolver(tierFormSchema),
    defaultValues: formValuesForTier(tier),
    mode: "onTouched",
  });

  const update = useApiMutation({
    mutationFn: (input: UpdateTierInput) => commissionsApi.updateTier(tier.id, input),
    invalidateKeys: [TIERS_QUERY_KEY],
    successMessage: "Commission tier saved.",
    onSuccess: () => onClose(),
  });

  const submitTier = form.handleSubmit((values) => update.mutate(toTierInput(values)));

  return (
    <Modal open onClose={onClose} title="Edit commission tier">
      <Form {...form}>
        <form onSubmit={submitTier} noValidate className="space-y-4">
          <TierFields form={form} />
          {update.isError && <FormBanner>{getErrorMessage(update.error)}</FormBanner>}
          <Button type="submit" isLoading={update.isPending}>
            Save changes
          </Button>
        </form>
      </Form>
    </Modal>
  );
};

export const CommissionTiersSection = () => {
  const { data: tiers, isLoading } = useQuery({
    queryKey: TIERS_QUERY_KEY,
    queryFn: commissionsApi.listTiers,
  });

  const form = useForm<TierFormValues>({
    resolver: zodResolver(tierFormSchema),
    defaultValues: EMPTY_TIER_FORM,
    mode: "onTouched",
  });
  const [editingTier, setEditingTier] = useState<CommissionTier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommissionTier | null>(null);

  const create = useApiMutation({
    mutationFn: (values: TierFormValues) => commissionsApi.createTier(toTierInput(values)),
    invalidateKeys: [TIERS_QUERY_KEY],
    successMessage: "Commission tier added.",
    onSuccess: () => form.reset(EMPTY_TIER_FORM),
  });

  const remove = useApiMutation({
    mutationFn: (id: string) => commissionsApi.deleteTier(id),
    invalidateKeys: [TIERS_QUERY_KEY],
    successMessage: "Commission tier deleted.",
    onSuccess: () => setDeleteTarget(null),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const submitTier = form.handleSubmit((values) => create.mutate(values));

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Commission tiers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Fixed commission a creator earns per attributed sale, by the sold item&apos;s price band.
      </p>

      <Form {...form}>
        <form
          onSubmit={submitTier}
          noValidate
          className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
        >
          <TierFields form={form} />
          <Button type="submit" isLoading={create.isPending} className="mt-[22px]">
            Add tier
          </Button>
        </form>
      </Form>

      {create.isError && <FormBanner className="mt-3">{getErrorMessage(create.error)}</FormBanner>}

      <div className="mt-4 space-y-2">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <ActionRowSkeleton key={index} actionCount={2} />
          ))}
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
                onClick={() => setDeleteTarget(tier)}
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

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete commission tier"
        description={deleteTarget ? `Delete the Rs. ${deleteTarget.amount} tier?` : undefined}
        confirmLabel="Delete"
        destructive
        isPending={remove.isPending}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
