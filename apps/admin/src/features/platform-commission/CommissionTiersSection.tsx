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

const rowForTier = (tier: PlatformCommissionTier): TierRowState => ({
  key: tier.id,
  minPrice: String(tier.minPrice),
  maxPrice: tier.maxPrice === null ? "" : String(tier.maxPrice),
  feeType: tier.feeType,
  flatAmount: tier.flatAmount === null ? "" : String(tier.flatAmount),
  ratePercent: tier.ratePercent === null ? "" : String(tier.ratePercent),
});

const emptyRow = (key: string, minPrice: string): TierRowState => ({
  key,
  minPrice,
  maxPrice: "",
  feeType: "PERCENT",
  flatAmount: "",
  ratePercent: "",
});

const toCreateTierInput = (row: TierRowState): CreateTierInput => ({
  minPrice: Number(row.minPrice),
  maxPrice: row.maxPrice === "" ? null : Number(row.maxPrice),
  feeType: row.feeType,
  ...(row.feeType === "FLAT"
    ? { flatAmount: Number(row.flatAmount) }
    : { ratePercent: Number(row.ratePercent) }),
});

const validateLadder = (rows: TierRowState[]): string | null => {
  if (rows.length === 0) return "Add at least one price band.";

  const sortedRows = [...rows].sort((a, b) => Number(a.minPrice) - Number(b.minPrice));
  const firstRow = sortedRows[0];
  const lastRow = sortedRows[sortedRows.length - 1];
  if (!firstRow || !lastRow) return "Add at least one price band.";

  if (Number(firstRow.minPrice) !== LADDER_FLOOR_PRICE) {
    return "The lowest band must start at Rs. 0.";
  }
  if (lastRow.maxPrice !== "") {
    return "The highest band must be open-ended — leave its max price blank.";
  }

  for (let index = 0; index < sortedRows.length - 1; index += 1) {
    const currentRow = sortedRows[index];
    const nextRow = sortedRows[index + 1];
    if (Number(currentRow?.maxPrice) !== Number(nextRow?.minPrice)) {
      return "Bands must be contiguous, with no gaps or overlaps between them.";
    }
  }

  for (const row of rows) {
    if (row.feeType === "FLAT" && row.flatAmount === "") {
      return "Every FLAT band needs a commission amount.";
    }
    if (row.feeType === "PERCENT" && row.ratePercent === "") {
      return "Every PERCENT band needs a commission rate.";
    }
  }

  return null;
};

const TierRowFields = ({
  row,
  onChange,
  onRemove,
}: {
  row: TierRowState;
  onChange: (row: TierRowState) => void;
  onRemove: () => void;
}) => (
  <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
    <div className="space-y-1.5">
      <label className="block text-xs text-muted-foreground">Min price (Rs.)</label>
      <Input
        type="number"
        required
        min={0}
        value={row.minPrice}
        onChange={(e) => onChange({ ...row, minPrice: e.target.value })}
        className="w-28"
      />
    </div>
    <div className="space-y-1.5">
      <label className="block text-xs text-muted-foreground">Max price (Rs.)</label>
      <Input
        type="number"
        min={0}
        placeholder="No limit"
        value={row.maxPrice}
        onChange={(e) => onChange({ ...row, maxPrice: e.target.value })}
        className="w-28"
      />
    </div>
    <div className="space-y-1.5">
      <label className="block text-xs text-muted-foreground">Fee type</label>
      <Select
        value={row.feeType}
        onChange={(e) => onChange({ ...row, feeType: e.target.value as FeeTypeValue })}
        className="w-32"
      >
        <option value="FLAT">Flat (Rs.)</option>
        <option value="PERCENT">Percent (%)</option>
      </Select>
    </div>
    {row.feeType === "FLAT" ? (
      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">Commission (Rs.)</label>
        <Input
          type="number"
          required
          min={1}
          value={row.flatAmount}
          onChange={(e) => onChange({ ...row, flatAmount: e.target.value })}
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
          value={row.ratePercent}
          onChange={(e) => onChange({ ...row, ratePercent: e.target.value })}
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
  const nextRowKey = useRef(0);

  const { data: rules, isLoading } = useQuery({
    queryKey: RULES_QUERY_KEY,
    queryFn: platformCommissionApi.listRules,
  });
  const activeRule = rules?.find((rule) => rule.isActive) ?? null;

  const [rows, setRows] = useState<TierRowState[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRows =
    rows ??
    (activeRule
      ? activeRule.tiers.map(rowForTier)
      : [emptyRow("new-0", String(LADDER_FLOOR_PRICE))]);

  const createRule = useMutation({
    mutationFn: (tiers: CreateTierInput[]) => platformCommissionApi.createRule(tiers),
    onSuccess: (rule) => {
      setRows(rule.tiers.map(rowForTier));
      setError(null);
      queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const updateRow = (key: string, nextRow: TierRowState) => {
    setRows(activeRows.map((row) => (row.key === key ? nextRow : row)));
  };

  const removeRow = (key: string) => {
    setRows(activeRows.filter((row) => row.key !== key));
  };

  const addRow = () => {
    const lastRow = activeRows[activeRows.length - 1];
    nextRowKey.current += 1;
    setRows([
      ...activeRows,
      emptyRow(`new-${nextRowKey.current}`, lastRow?.maxPrice ?? String(LADDER_FLOOR_PRICE)),
    ]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateLadder(activeRows);
    if (validationError) {
      setError(validationError);
      return;
    }
    createRule.mutate(activeRows.map(toCreateTierInput));
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
          activeRows.map((row) => (
            <TierRowFields
              key={row.key}
              row={row}
              onChange={(nextRow) => updateRow(row.key, nextRow)}
              onRemove={() => removeRow(row.key)}
            />
          ))}

        {!isLoading && (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
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
