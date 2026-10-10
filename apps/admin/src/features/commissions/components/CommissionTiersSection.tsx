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
import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { getErrorMessage } from "@/lib/errorMessages";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { commissionsApi, type CreateTierInput, type UpdateTierInput } from "../api/commissionsApi";
import type { CommissionScopeValue, CommissionTier } from "../api/commissionsSchemas";
import { commissionQueryKeys, tierChangeQueryKeys } from "../constants/commissionQueryKeys";
import { COMMISSION_SCOPE_COPY } from "../constants/commissionScopeCopy";
import { EMPTY_TIER_FORM, tierFormSchema, type TierFormValues } from "../schemas/tierForm.schema";

const LABEL_CLASS = "text-xs font-normal text-muted-foreground";
const NO_OVERLAPS = 0;

const hasOverlap = ({ overlapsWithTierIds }: CommissionTier): boolean =>
  overlapsWithTierIds.length > NO_OVERLAPS;

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
        <FormItem className={`mt-0 ${widthClass} space-y-1.5`}>
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

type EditTierModalProps = {
  scope: CommissionScopeValue;
  tier: CommissionTier;
  onClose: () => void;
};

const EditTierModal = ({ scope, tier, onClose }: EditTierModalProps) => {
  const form = useForm<TierFormValues>({
    resolver: zodResolver(tierFormSchema),
    defaultValues: formValuesForTier(tier),
    mode: "onTouched",
  });

  const update = useApiMutation({
    mutationFn: (input: UpdateTierInput) => commissionsApi.updateTier(scope, tier.id, input),
    invalidateKeys: tierChangeQueryKeys(scope),
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

export const CommissionTiersSection = ({ scope }: { scope: CommissionScopeValue }) => {
  const { canUse } = usePlatformPermissions();
  const canManageCommissions = canUse(PLATFORM_MANAGE_PERMISSION.COMMISSIONS);
  const { title, description } = COMMISSION_SCOPE_COPY[scope];
  const tierChangeKeys = tierChangeQueryKeys(scope);
  const { data: tiers, isLoading } = useQuery({
    queryKey: commissionQueryKeys.tiers(scope),
    queryFn: () => commissionsApi.listTiers(scope),
  });
  const isAnyTierOverlapping = tiers?.some(hasOverlap) ?? false;

  const form = useForm<TierFormValues>({
    resolver: zodResolver(tierFormSchema),
    defaultValues: EMPTY_TIER_FORM,
    mode: "onTouched",
  });
  const [editingTier, setEditingTier] = useState<CommissionTier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommissionTier | null>(null);

  const create = useApiMutation({
    mutationFn: (values: TierFormValues) => commissionsApi.createTier(scope, toTierInput(values)),
    invalidateKeys: tierChangeKeys,
    successMessage: "Commission tier added.",
    onSuccess: () => form.reset(EMPTY_TIER_FORM),
  });

  const remove = useApiMutation({
    mutationFn: (id: string) => commissionsApi.deleteTier(scope, id),
    invalidateKeys: tierChangeKeys,
    successMessage: "Commission tier deleted.",
    onSuccess: () => setDeleteTarget(null),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const submitTier = form.handleSubmit((values) => create.mutate(values));

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      {isAnyTierOverlapping && (
        <FormBanner className="mt-3">
          Some price bands overlap. A price inside two bands uses the one with the higher minimum
          price — fix the overlap so the commission is never a surprise.
        </FormBanner>
      )}

      {canManageCommissions && (
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
      )}

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
            <div>
              <p className="text-sm text-foreground">
                Rs. {tier.minPrice.toLocaleString()}
                {tier.maxPrice === null ? "+" : ` – Rs. ${tier.maxPrice.toLocaleString()}`} → Rs.{" "}
                {tier.amount.toLocaleString()} commission
              </p>
              {hasOverlap(tier) && (
                <p className="mt-1 text-xs font-medium text-destructive">
                  Overlaps another price band
                </p>
              )}
            </div>
            {canManageCommissions && (
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
            )}
          </div>
        ))}
      </div>

      {editingTier && (
        <EditTierModal
          key={editingTier.id}
          scope={scope}
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
