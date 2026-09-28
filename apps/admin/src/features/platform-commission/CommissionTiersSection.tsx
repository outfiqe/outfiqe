import { Button, FormBanner, Input, Select, Skeleton } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useRef, useState } from "react";

import { SkeletonButton } from "@/components/SkeletonControls";
import { usePlatformPermissions } from "@/features/auth/usePlatformPermissions";
import { getErrorMessage } from "@/lib/errorMessages";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { type CreateTierInput, platformCommissionApi } from "./api";
import { type TierRowErrors, type TierRowState, validateLadder } from "./ladder.schema";
import type { FeeTypeValue, PlatformCommissionTier } from "./schemas";

const RULES_QUERY_KEY = ["admin-platform-commission-rules"];
const LADDER_FLOOR_PRICE = 0;

const tierRowFor = (tier: PlatformCommissionTier): TierRowState => ({
  key: tier.id,
  minPrice: String(tier.minPrice),
  maxPrice: tier.maxPrice === null ? "" : String(tier.maxPrice),
  feeType: tier.feeType,
  flatAmount: tier.flatAmount === null ? "" : String(tier.flatAmount),
  ratePercent: tier.ratePercent === null ? "" : String(tier.ratePercent),
});

const emptyTierRow = (key: string, minPrice: string): TierRowState => ({
  key,
  minPrice,
  maxPrice: "",
  feeType: "PERCENT",
  flatAmount: "",
  ratePercent: "",
});

const toCreateTierInput = (tierRow: TierRowState): CreateTierInput => ({
  minPrice: Number(tierRow.minPrice),
  maxPrice: tierRow.maxPrice === "" ? null : Number(tierRow.maxPrice),
  feeType: tierRow.feeType,
  ...(tierRow.feeType === "FLAT"
    ? { flatAmount: Number(tierRow.flatAmount) }
    : { ratePercent: Number(tierRow.ratePercent) }),
});

const TIER_ROW_SKELETON_COUNT = 3;
const TIER_FIELD_SKELETONS = [
  { label: "Min price (Rs.)", inputClass: "w-28" },
  { label: "Max price (Rs.)", inputClass: "w-28" },
  { label: "Fee type", inputClass: "w-32" },
  { label: "Commission (Rs.)", inputClass: "w-28" },
];

const TierRowSkeleton = () => (
  <div
    className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
    aria-hidden
  >
    {TIER_FIELD_SKELETONS.map(({ label, inputClass }) => (
      <div key={label} className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">{label}</label>
        <Skeleton className={`h-11 rounded-lg ${inputClass}`} />
      </div>
    ))}
    <SkeletonButton variant="ghost" size="sm" label="Remove" />
  </div>
);

const FIELD_LABEL_CLASS = "block text-xs text-muted-foreground";
const FIELD_ERROR_CLASS = "text-xs text-destructive";

const TierRowFields = ({
  tierRow,
  errors,
  onChange,
  onRemove,
}: {
  tierRow: TierRowState;
  errors: TierRowErrors;
  onChange: (tierRow: TierRowState) => void;
  onRemove: () => void;
}) => {
  const idPrefix = `tier-${tierRow.key}`;

  const numberField = (
    field: "minPrice" | "maxPrice" | "flatAmount" | "ratePercent",
    label: string,
    widthClass: string,
    placeholder?: string,
  ) => (
    <div className="space-y-1.5">
      <label htmlFor={`${idPrefix}-${field}`} className={FIELD_LABEL_CLASS}>
        {label}
      </label>
      <Input
        id={`${idPrefix}-${field}`}
        inputMode="decimal"
        placeholder={placeholder}
        value={tierRow[field]}
        aria-invalid={errors[field] ? true : undefined}
        onChange={(e) => onChange({ ...tierRow, [field]: e.target.value })}
        className={widthClass}
      />
      {errors[field] && (
        <p className={FIELD_ERROR_CLASS} role="alert">
          {errors[field]}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4">
      {numberField("minPrice", "Min price (Rs.)", "w-28")}
      {numberField("maxPrice", "Max price (Rs.)", "w-28", "No limit")}
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-feeType`} className={FIELD_LABEL_CLASS}>
          Fee type
        </label>
        <Select
          id={`${idPrefix}-feeType`}
          value={tierRow.feeType}
          onChange={(e) => onChange({ ...tierRow, feeType: e.target.value as FeeTypeValue })}
          className="w-32"
        >
          <option value="FLAT">Flat (Rs.)</option>
          <option value="PERCENT">Percent (%)</option>
        </Select>
      </div>
      {tierRow.feeType === "FLAT"
        ? numberField("flatAmount", "Commission (Rs.)", "w-28")
        : numberField("ratePercent", "Commission (%)", "w-24")}
      <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="mt-[22px]">
        Remove
      </Button>
    </div>
  );
};

export const CommissionTiersSection = () => {
  const { canUse } = usePlatformPermissions();
  const canManageCommissions = canUse(PLATFORM_MANAGE_PERMISSION.COMMISSIONS);
  const nextTierRowKey = useRef(0);

  const { data: rules, isLoading } = useQuery({
    queryKey: RULES_QUERY_KEY,
    queryFn: platformCommissionApi.listRules,
  });
  const activeRule = rules?.find((rule) => rule.isActive) ?? null;

  const [tierRows, setTierRows] = useState<TierRowState[] | null>(null);
  const [rowErrorsByKey, setRowErrorsByKey] = useState<Record<string, TierRowErrors>>({});
  const [ladderError, setLadderError] = useState<string | null>(null);
  const activeTierRows =
    tierRows ??
    (activeRule
      ? activeRule.tiers.map(tierRowFor)
      : [emptyTierRow("new-0", String(LADDER_FLOOR_PRICE))]);

  const createRule = useApiMutation({
    mutationFn: (tiers: CreateTierInput[]) => platformCommissionApi.createRule(tiers),
    invalidateKeys: [RULES_QUERY_KEY],
    successMessage: "New commission ladder saved.",
    onSuccess: (rule) => {
      setTierRows(rule.tiers.map(tierRowFor));
      setRowErrorsByKey({});
      setLadderError(null);
    },
  });

  const updateTierRow = (key: string, updatedTierRow: TierRowState) => {
    setTierRows(activeTierRows.map((tierRow) => (tierRow.key === key ? updatedTierRow : tierRow)));
  };

  const removeTierRow = (key: string) => {
    setTierRows(activeTierRows.filter((tierRow) => tierRow.key !== key));
  };

  const addTierRow = () => {
    const lastTierRow = activeTierRows[activeTierRows.length - 1];
    nextTierRowKey.current += 1;
    setTierRows([
      ...activeTierRows,
      emptyTierRow(
        `new-${nextTierRowKey.current}`,
        lastTierRow?.maxPrice ?? String(LADDER_FLOOR_PRICE),
      ),
    ]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const { rowErrorsByKey: foundRowErrors, ladderError: foundLadderError } =
      validateLadder(activeTierRows);
    setRowErrorsByKey(foundRowErrors);
    setLadderError(foundLadderError);
    if (Object.keys(foundRowErrors).length > 0 || foundLadderError) return;

    createRule.mutate(activeTierRows.map(toCreateTierInput));
  };

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Commission tiers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The default take rate a brand pays per sold item, banded by the item&apos;s price. Bands
        must start at Rs. 0, be contiguous, and the top band must be open-ended. Saving replaces the
        entire ladder as a new version — existing orders keep the rate that applied at checkout.
      </p>
      {activeRule && (
        <p className="mt-1 text-xs text-muted-foreground">
          Active since {new Date(activeRule.createdAt).toLocaleDateString()}.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
        <fieldset disabled={!canManageCommissions} className="contents">
          {isLoading &&
            Array.from({ length: TIER_ROW_SKELETON_COUNT }, (_unused, rowIndex) => (
              <TierRowSkeleton key={rowIndex} />
            ))}

          {!isLoading &&
            activeTierRows.map((tierRow) => (
              <TierRowFields
                key={tierRow.key}
                tierRow={tierRow}
                errors={rowErrorsByKey[tierRow.key] ?? {}}
                onChange={(updatedTierRow) => updateTierRow(tierRow.key, updatedTierRow)}
                onRemove={() => removeTierRow(tierRow.key)}
              />
            ))}

          {canManageCommissions && !isLoading && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={addTierRow}>
                Add band
              </Button>
              <Button type="submit" isLoading={createRule.isPending}>
                Save as new version
              </Button>
            </div>
          )}

          {ladderError && <FormBanner>{ladderError}</FormBanner>}
          {createRule.isError && <FormBanner>{getErrorMessage(createRule.error)}</FormBanner>}
        </fieldset>
      </form>
    </div>
  );
};
