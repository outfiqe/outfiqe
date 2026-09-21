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
  Select,
  Skeleton,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { SkeletonButton } from "@/components/SkeletonControls";
import { getErrorMessage } from "@/lib/errorMessages";

import { type UpdateWithdrawPolicyInput, withdrawPolicyApi } from "./api";
import { policyFormSchema, type PolicyFormValues } from "./policyForm.schema";
import { type OwnerTypeValue, type WindowTypeValue, type WithdrawPolicy } from "./schemas";

const OWNER_TABS: OwnerTypeValue[] = ["CREATOR", "BUSINESS"];
const OWNER_TAB_LABEL: Record<OwnerTypeValue, string> = {
  CREATOR: "Creator",
  BUSINESS: "Business",
};
const WINDOW_TYPES: WindowTypeValue[] = ["MONTHLY", "WEEKLY", "CUSTOM_DAYS"];

const LABEL_CLASS = "text-xs font-normal text-muted-foreground";

const formValuesForPolicy = (policy: WithdrawPolicy): PolicyFormValues => ({
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
  values: PolicyFormValues,
): UpdateWithdrawPolicyInput => ({
  ownerType,
  minAmount: Number(values.minAmount),
  maxAmount: Number(values.maxAmount),
  windowType: values.windowType,
  windowValue: Number(values.windowValue),
  maxAttemptsPerWindow: Number(values.maxAttemptsPerWindow),
  cooldownAfterRejectionDays: Number(values.cooldownAfterRejectionDays),
  processingNoteText: values.processingNoteText.trim(),
});

type NumberFieldName =
  "minAmount" | "maxAmount" | "windowValue" | "maxAttemptsPerWindow" | "cooldownAfterRejectionDays";

const PolicyForm = ({ ownerType }: { ownerType: OwnerTypeValue }) => {
  const { data: policy, isLoading } = useQuery({
    queryKey: ["withdraw-policy", ownerType],
    queryFn: () => withdrawPolicyApi.get(ownerType),
  });

  if (isLoading || !policy) return <WithdrawPolicySkeleton />;

  return <PolicyFormFields ownerType={ownerType} policy={policy} />;
};

const PolicyFormFields = ({
  ownerType,
  policy,
}: {
  ownerType: OwnerTypeValue;
  policy: WithdrawPolicy;
}) => {
  const queryClient = useQueryClient();
  const queryKey = ["withdraw-policy", ownerType];

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: formValuesForPolicy(policy),
    mode: "onTouched",
  });

  const update = useApiMutation({
    mutationFn: (input: UpdateWithdrawPolicyInput) => withdrawPolicyApi.update(input),
    successMessage: "Withdrawal policy saved.",
    onSuccess: (updatedPolicy) => {
      queryClient.setQueryData(queryKey, updatedPolicy);
      form.reset(formValuesForPolicy(updatedPolicy));
    },
  });

  const submitPolicy = form.handleSubmit((values) =>
    update.mutate(toUpdateInput(ownerType, values)),
  );

  const numberField = (name: NumberFieldName, label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className={LABEL_CLASS}>{label}</FormLabel>
          <FormControl>
            <Input inputMode="numeric" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form
        onSubmit={submitPolicy}
        noValidate
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {numberField("minAmount", "Min amount (Rs.)")}
          {numberField("maxAmount", "Max amount (Rs.)")}
          <FormField
            control={form.control}
            name="windowType"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className={LABEL_CLASS}>Window type</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {WINDOW_TYPES.map((windowType) => (
                      <option key={windowType} value={windowType}>
                        {windowType}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {numberField("windowValue", "Window value (days before month end / every N days)")}
          {numberField("maxAttemptsPerWindow", "Attempts per window")}
          {numberField("cooldownAfterRejectionDays", "Cooldown after rejection (days)")}
        </div>

        <FormField
          control={form.control}
          name="processingNoteText"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className={LABEL_CLASS}>Processing note</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {update.isError && <FormBanner>{getErrorMessage(update.error)}</FormBanner>}

        <Button type="submit" isLoading={update.isPending}>
          Save policy
        </Button>
      </form>
    </Form>
  );
};

const POLICY_GRID_FIELD_LABELS = [
  "Min amount (Rs.)",
  "Max amount (Rs.)",
  "Window type",
  "Window value (days before month end / every N days)",
  "Attempts per window",
  "Cooldown after rejection (days)",
];

const PolicyFieldSkeleton = ({ label }: { label: string }) => (
  <div className="space-y-1.5">
    <label className="block text-xs text-muted-foreground">{label}</label>
    <Skeleton className="h-11 w-full rounded-lg" />
  </div>
);

const WithdrawPolicySkeleton = () => (
  <div
    className="space-y-4 rounded-xl border border-border bg-card p-5"
    role="status"
    aria-label="Loading"
  >
    <div className="grid gap-3 sm:grid-cols-2">
      {POLICY_GRID_FIELD_LABELS.map((label) => (
        <PolicyFieldSkeleton key={label} label={label} />
      ))}
    </div>
    <PolicyFieldSkeleton label="Processing note" />
    <SkeletonButton variant="default" label="Save policy" />
  </div>
);

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
