import { Button, FormBanner, Input, Select } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useRef, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { type CreateTierInput, platformCommissionApi } from "./api";
import type { FeeTypeValue, PlatformCommissionTier } from "./schemas";

const RULES_QUERY_KEY = ["admin-platform-commission-rules"];
const LADDER_FLOOR_PRICE = 0;

type TierRowState = {
  key: string;
  minPrice: string;
  maxPrice: string;
  feeType: FeeTypeValue;
  flatAmount: string;
  ratePercent: string;
};

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

const validateLadder = (tierRows: TierRowState[]): string | null => {
  if (tierRows.length === 0) return "Add at least one price band.";

  const sortedTierRows = [...tierRows].sort((a, b) => Number(a.minPrice) - Number(b.minPrice));
  const firstTierRow = sortedTierRows[0];
  const lastTierRow = sortedTierRows[sortedTierRows.length - 1];
  if (!firstTierRow || !lastTierRow) return "Add at least one price band.";

  if (Number(firstTierRow.minPrice) !== LADDER_FLOOR_PRICE) {
    return "The lowest band must start at Rs. 0.";
  }
  if (lastTierRow.maxPrice !== "") {
    return "The highest band must be open-ended — leave its max price blank.";
  }

  for (let index = 0; index < sortedTierRows.length - 1; index += 1) {
    const currentTierRow = sortedTierRows[index];
    const nextTierRow = sortedTierRows[index + 1];
    if (Number(currentTierRow?.maxPrice) !== Number(nextTierRow?.minPrice)) {
      return "Bands must be contiguous, with no gaps or overlaps between them.";
    }
  }

  for (const tierRow of tierRows) {
    if (tierRow.feeType === "FLAT" && tierRow.flatAmount === "") {
      return "Every FLAT band needs a commission amount.";
    }
    if (tierRow.feeType === "PERCENT" && tierRow.ratePercent === "") {
      return "Every PERCENT band needs a commission rate.";
    }
  }

  return null;
};

const TierRowFields = ({
  tierRow,
  onChange,
  onRemove,
}: {
  tierRow: TierRowState;
  onChange: (tierRow: TierRowState) => void;
  onRemove: () => void;
}) => (
  <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
    <div className="space-y-1.5">
      <label className="block text-xs text-muted-foreground">Min price (Rs.)</label>
      <Input
        type="number"
        required
        min={0}
        value={tierRow.minPrice}
        onChange={(e) => onChange({ ...tierRow, minPrice: e.target.value })}
        className="w-28"
      />
    </div>
    <div className="space-y-1.5">
      <label className="block text-xs text-muted-foreground">Max price (Rs.)</label>
      <Input
        type="number"
        min={0}
        placeholder="No limit"
        value={tierRow.maxPrice}
        onChange={(e) => onChange({ ...tierRow, maxPrice: e.target.value })}
        className="w-28"
      />
    </div>
    <div className="space-y-1.5">
      <label className="block text-xs text-muted-foreground">Fee type</label>
      <Select
        value={tierRow.feeType}
        onChange={(e) => onChange({ ...tierRow, feeType: e.target.value as FeeTypeValue })}
        className="w-32"
      >
        <option value="FLAT">Flat (Rs.)</option>
        <option value="PERCENT">Percent (%)</option>
      </Select>
    </div>
    {tierRow.feeType === "FLAT" ? (
      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">Commission (Rs.)</label>
        <Input
          type="number"
          required
          min={1}
          value={tierRow.flatAmount}
          onChange={(e) => onChange({ ...tierRow, flatAmount: e.target.value })}
          className="w-28"
        />
      </div>
    ) : (
      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">Commission (%)</label>
        <Input
          type="number"
          required
          min={0.01}
          step={0.01}
          value={tierRow.ratePercent}
          onChange={(e) => onChange({ ...tierRow, ratePercent: e.target.value })}
          className="w-24"
        />
      </div>
    )}
    <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
      Remove
    </Button>
  </div>
);

export const CommissionTiersSection = () => {
  const queryClient = useQueryClient();
  const nextTierRowKey = useRef(0);

  const { data: rules, isLoading } = useQuery({
    queryKey: RULES_QUERY_KEY,
    queryFn: platformCommissionApi.listRules,
  });
  const activeRule = rules?.find((rule) => rule.isActive) ?? null;

  const [tierRows, setTierRows] = useState<TierRowState[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeTierRows =
    tierRows ??
    (activeRule
      ? activeRule.tiers.map(tierRowFor)
      : [emptyTierRow("new-0", String(LADDER_FLOOR_PRICE))]);

  const createRule = useMutation({
    mutationFn: (tiers: CreateTierInput[]) => platformCommissionApi.createRule(tiers),
    onSuccess: (rule) => {
      setTierRows(rule.tiers.map(tierRowFor));
      setError(null);
      queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
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
    const validationError = validateLadder(activeTierRows);
    if (validationError) {
      setError(validationError);
      return;
    }
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

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!isLoading &&
          activeTierRows.map((tierRow) => (
            <TierRowFields
              key={tierRow.key}
              tierRow={tierRow}
              onChange={(updatedTierRow) => updateTierRow(tierRow.key, updatedTierRow)}
              onRemove={() => removeTierRow(tierRow.key)}
            />
          ))}

        {!isLoading && (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={addTierRow}>
              Add band
            </Button>
            <Button type="submit" disabled={createRule.isPending}>
              {createRule.isPending ? "Saving…" : "Save as new version"}
            </Button>
          </div>
        )}

        {error && <FormBanner>{error}</FormBanner>}
      </form>
    </div>
  );
};
