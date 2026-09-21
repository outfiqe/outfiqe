import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Checkbox,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Modal,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { ActionRowSkeleton } from "@/components/ActionRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { type CreateXpMultiplierInput, gamificationApi, type UpdateXpMultiplierInput } from "./api";
import { toDatetimeLocalValue, toIsoOrNull } from "./datetime.utils";
import {
  buildEmptyMultiplierForm,
  multiplierFormSchema,
  type MultiplierFormValues,
} from "./multiplierForm.schema";
import type { XpMultiplier } from "./schemas";

const MULTIPLIERS_QUERY_KEY = ["admin-xp-multipliers"];

const buildCurrentEmptyForm = () =>
  buildEmptyMultiplierForm(toDatetimeLocalValue(new Date().toISOString()));

const toCreateInput = (values: MultiplierFormValues): CreateXpMultiplierInput => ({
  label: values.label,
  multiplier: Number(values.multiplier),
  startsAt: toIsoOrNull(values.startsAt) ?? new Date().toISOString(),
  endsAt: toIsoOrNull(values.endsAt) ?? new Date().toISOString(),
});

const isCurrentlyActive = (multiplierRow: XpMultiplier) => {
  const now = Date.now();
  return (
    multiplierRow.isActive &&
    new Date(multiplierRow.startsAt).getTime() <= now &&
    new Date(multiplierRow.endsAt).getTime() >= now
  );
};

const MultiplierFields = ({ form }: { form: UseFormReturn<MultiplierFormValues> }) => (
  <div className="flex flex-wrap items-start gap-3">
    <FormField
      control={form.control}
      name="label"
      render={({ field }) => (
        <FormItem className="min-w-48 flex-1 space-y-1.5">
          <FormLabel className="text-xs font-normal text-muted-foreground">Label</FormLabel>
          <FormControl>
            <Input placeholder="Founders Weekend" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="multiplier"
      render={({ field }) => (
        <FormItem className="w-24 space-y-1.5">
          <FormLabel className="text-xs font-normal text-muted-foreground">Multiplier</FormLabel>
          <FormControl>
            <Input inputMode="decimal" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="startsAt"
      render={({ field }) => (
        <FormItem className="w-full space-y-1.5 sm:w-56">
          <FormLabel className="text-xs font-normal text-muted-foreground">Starts</FormLabel>
          <FormControl>
            <Input type="datetime-local" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="endsAt"
      render={({ field }) => (
        <FormItem className="w-full space-y-1.5 sm:w-56">
          <FormLabel className="text-xs font-normal text-muted-foreground">Ends</FormLabel>
          <FormControl>
            <Input type="datetime-local" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

const formForMultiplier = (multiplierRow: XpMultiplier): MultiplierFormValues => ({
  label: multiplierRow.label,
  multiplier: String(multiplierRow.multiplier),
  startsAt: toDatetimeLocalValue(multiplierRow.startsAt),
  endsAt: toDatetimeLocalValue(multiplierRow.endsAt),
});

const EditMultiplierModal = ({
  multiplierRow,
  onClose,
}: {
  multiplierRow: XpMultiplier;
  onClose: () => void;
}) => {
  const [isActive, setIsActive] = useState(multiplierRow.isActive);
  const form = useForm<MultiplierFormValues>({
    resolver: zodResolver(multiplierFormSchema),
    defaultValues: formForMultiplier(multiplierRow),
    mode: "onTouched",
  });

  const update = useApiMutation({
    mutationFn: (input: UpdateXpMultiplierInput) =>
      gamificationApi.updateXpMultiplier(multiplierRow.id, input),
    invalidateKeys: [MULTIPLIERS_QUERY_KEY],
    successMessage: "XP multiplier updated.",
    onSuccess: () => onClose(),
  });

  const submitMultiplierEdit = form.handleSubmit((values) =>
    update.mutate({ ...toCreateInput(values), isActive }),
  );

  return (
    <Modal open onClose={onClose} title="Edit XP multiplier">
      <Form {...form}>
        <form onSubmit={submitMultiplierEdit} noValidate className="space-y-4">
          <MultiplierFields form={form} />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              id={`edit-multiplier-${multiplierRow.id}-active`}
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active
          </label>
          {update.isError && <FormBanner>{getErrorMessage(update.error)}</FormBanner>}
          <Button type="submit" isLoading={update.isPending}>
            Save changes
          </Button>
        </form>
      </Form>
    </Modal>
  );
};

export const MultipliersSection = () => {
  const { data: multipliers, isLoading } = useQuery({
    queryKey: MULTIPLIERS_QUERY_KEY,
    queryFn: gamificationApi.listXpMultipliers,
  });

  const [editingMultiplier, setEditingMultiplier] = useState<XpMultiplier | null>(null);
  const form = useForm<MultiplierFormValues>({
    resolver: zodResolver(multiplierFormSchema),
    defaultValues: buildCurrentEmptyForm(),
    mode: "onTouched",
  });

  const create = useApiMutation({
    mutationFn: (values: MultiplierFormValues) =>
      gamificationApi.createXpMultiplier(toCreateInput(values)),
    invalidateKeys: [MULTIPLIERS_QUERY_KEY],
    successMessage: "XP multiplier added.",
    onSuccess: () => form.reset(buildCurrentEmptyForm()),
  });

  const submitMultiplier = form.handleSubmit((values) => create.mutate(values));

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">XP multipliers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Time-boxed events that scale up activity-earned XP — a &quot;2x weekend,&quot; for example.
        Only the highest-multiplier active window applies if more than one overlaps. Manual XP
        adjustments and achievement/badge rewards are never multiplied.
      </p>

      <Form {...form}>
        <form
          onSubmit={submitMultiplier}
          noValidate
          className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
        >
          <MultiplierFields form={form} />
          <Button type="submit" isLoading={create.isPending} className="mt-[22px]">
            Add multiplier
          </Button>
        </form>
      </Form>

      {create.isError && <FormBanner className="mt-3">{getErrorMessage(create.error)}</FormBanner>}

      <div className="mt-4 space-y-2">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => <ActionRowSkeleton key={index} />)}
        {multipliers?.length === 0 && (
          <p className="text-sm text-muted-foreground">No XP multipliers yet.</p>
        )}

        {multipliers?.map((multiplierRow) => (
          <div
            key={multiplierRow.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <p className="text-sm text-foreground">
              {multiplierRow.label} — {multiplierRow.multiplier}x
              {isCurrentlyActive(multiplierRow) && (
                <span className="ml-2 text-xs font-medium text-primary-strong">● live now</span>
              )}
              {!multiplierRow.isActive && (
                <span className="ml-2 text-xs text-muted-foreground">(deactivated)</span>
              )}
              <span className="ml-2 block text-xs text-muted-foreground sm:inline">
                {new Date(multiplierRow.startsAt).toLocaleString()} –{" "}
                {new Date(multiplierRow.endsAt).toLocaleString()}
              </span>
            </p>
            <Button variant="outline" size="sm" onClick={() => setEditingMultiplier(multiplierRow)}>
              Edit
            </Button>
          </div>
        ))}
      </div>

      {editingMultiplier && (
        <EditMultiplierModal
          key={editingMultiplier.id}
          multiplierRow={editingMultiplier}
          onClose={() => setEditingMultiplier(null)}
        />
      )}
    </div>
  );
};
