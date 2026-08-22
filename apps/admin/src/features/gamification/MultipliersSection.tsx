import { Button, Checkbox, FormBanner, Input, Modal } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { type CreateXpMultiplierInput, gamificationApi, type UpdateXpMultiplierInput } from "./api";
import { toDatetimeLocalValue, toIsoOrNull } from "./datetime.utils";
import type { XpMultiplier } from "./schemas";

const MULTIPLIERS_QUERY_KEY = ["admin-xp-multipliers"];

type MultiplierFormState = {
  label: string;
  multiplier: string;
  startsAt: string;
  endsAt: string;
};

const EMPTY_FORM: MultiplierFormState = {
  label: "",
  multiplier: "2",
  startsAt: toDatetimeLocalValue(new Date().toISOString()),
  endsAt: "",
};

const toCreateInput = (form: MultiplierFormState): CreateXpMultiplierInput => ({
  label: form.label,
  multiplier: Number(form.multiplier),
  startsAt: toIsoOrNull(form.startsAt) ?? new Date().toISOString(),
  endsAt: toIsoOrNull(form.endsAt) ?? new Date().toISOString(),
});

const isCurrentlyActive = (multiplierRow: XpMultiplier) => {
  const now = Date.now();
  return (
    multiplierRow.isActive &&
    new Date(multiplierRow.startsAt).getTime() <= now &&
    new Date(multiplierRow.endsAt).getTime() >= now
  );
};

const MultiplierFields = ({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: MultiplierFormState;
  onChange: (form: MultiplierFormState) => void;
}) => (
  <div className="flex flex-wrap items-end gap-3">
    <div className="min-w-48 flex-1 space-y-1.5">
      <label htmlFor={`${idPrefix}-label`} className="block text-xs text-muted-foreground">
        Label
      </label>
      <Input
        id={`${idPrefix}-label`}
        required
        placeholder="Founders Weekend"
        value={form.label}
        onChange={(e) => onChange({ ...form, label: e.target.value })}
      />
    </div>
    <div className="space-y-1.5">
      <label htmlFor={`${idPrefix}-multiplier`} className="block text-xs text-muted-foreground">
        Multiplier
      </label>
      <Input
        id={`${idPrefix}-multiplier`}
        type="number"
        required
        min={1}
        max={10}
        step={0.1}
        value={form.multiplier}
        onChange={(e) => onChange({ ...form, multiplier: e.target.value })}
        className="w-24"
      />
    </div>
    <div className="space-y-1.5">
      <label htmlFor={`${idPrefix}-starts-at`} className="block text-xs text-muted-foreground">
        Starts
      </label>
      <Input
        id={`${idPrefix}-starts-at`}
        type="datetime-local"
        required
        value={form.startsAt}
        onChange={(e) => onChange({ ...form, startsAt: e.target.value })}
        className="w-full sm:w-56"
      />
    </div>
    <div className="space-y-1.5">
      <label htmlFor={`${idPrefix}-ends-at`} className="block text-xs text-muted-foreground">
        Ends
      </label>
      <Input
        id={`${idPrefix}-ends-at`}
        type="datetime-local"
        required
        value={form.endsAt}
        onChange={(e) => onChange({ ...form, endsAt: e.target.value })}
        className="w-full sm:w-56"
      />
    </div>
  </div>
);

const formForMultiplier = (multiplierRow: XpMultiplier): MultiplierFormState => ({
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
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MultiplierFormState>(() => formForMultiplier(multiplierRow));
  const [isActive, setIsActive] = useState(multiplierRow.isActive);
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (input: UpdateXpMultiplierInput) =>
      gamificationApi.updateXpMultiplier(multiplierRow.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MULTIPLIERS_QUERY_KEY });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate({ ...toCreateInput(form), isActive });
  };

  return (
    <Modal open onClose={onClose} title="Edit XP multiplier">
      <form onSubmit={handleSubmit} className="space-y-4">
        <MultiplierFields
          idPrefix={`edit-multiplier-${multiplierRow.id}`}
          form={form}
          onChange={setForm}
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            id={`edit-multiplier-${multiplierRow.id}-active`}
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active
        </label>
        {error && <FormBanner>{error}</FormBanner>}
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Modal>
  );
};

export const MultipliersSection = () => {
  const queryClient = useQueryClient();
  const { data: multipliers, isLoading } = useQuery({
    queryKey: MULTIPLIERS_QUERY_KEY,
    queryFn: gamificationApi.listXpMultipliers,
  });

  const [form, setForm] = useState<MultiplierFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [editingMultiplier, setEditingMultiplier] = useState<XpMultiplier | null>(null);

  const create = useMutation({
    mutationFn: () => gamificationApi.createXpMultiplier(toCreateInput(form)),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setError(null);
      queryClient.invalidateQueries({ queryKey: MULTIPLIERS_QUERY_KEY });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">XP multipliers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Time-boxed events that scale up activity-earned XP — a &quot;2x weekend,&quot; for example.
        Only the highest-multiplier active window applies if more than one overlaps. Manual XP
        adjustments and achievement/badge rewards are never multiplied.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <MultiplierFields idPrefix="create-multiplier" form={form} onChange={setForm} />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Add multiplier"}
        </Button>
      </form>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
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
