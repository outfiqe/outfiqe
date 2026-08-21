import { Button, Checkbox, FormBanner, Input, Modal } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { type CreateLevelInput, gamificationApi, type UpdateLevelInput } from "./api";
import type { Level } from "./schemas";

const LEVELS_QUERY_KEY = ["admin-levels"];

type LevelFormState = {
  level: string;
  name: string;
  requiredXp: string;
  icon: string;
};

const EMPTY_FORM: LevelFormState = { level: "", name: "", requiredXp: "", icon: "" };

const toCreateInput = (form: LevelFormState): CreateLevelInput => ({
  level: Number(form.level),
  name: form.name,
  requiredXp: Number(form.requiredXp),
  ...(form.icon ? { icon: form.icon } : {}),
});

const LevelFields = ({
  idPrefix,
  form,
  onChange,
  levelEditable,
}: {
  idPrefix: string;
  form: LevelFormState;
  onChange: (form: LevelFormState) => void;
  levelEditable: boolean;
}) => (
  <div className="flex flex-wrap items-end gap-3">
    <div className="space-y-1.5">
      <label htmlFor={`${idPrefix}-level`} className="block text-xs text-muted-foreground">
        Level number
      </label>
      <Input
        id={`${idPrefix}-level`}
        type="number"
        required
        min={1}
        disabled={!levelEditable}
        value={form.level}
        onChange={(e) => onChange({ ...form, level: e.target.value })}
        className="w-24"
      />
    </div>
    <div className="space-y-1.5">
      <label htmlFor={`${idPrefix}-name`} className="block text-xs text-muted-foreground">
        Name
      </label>
      <Input
        id={`${idPrefix}-name`}
        required
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        className="w-48"
      />
    </div>
    <div className="space-y-1.5">
      <label htmlFor={`${idPrefix}-required-xp`} className="block text-xs text-muted-foreground">
        Required XP
      </label>
      <Input
        id={`${idPrefix}-required-xp`}
        type="number"
        required
        min={0}
        value={form.requiredXp}
        onChange={(e) => onChange({ ...form, requiredXp: e.target.value })}
        className="w-32"
      />
    </div>
    <div className="space-y-1.5">
      <label htmlFor={`${idPrefix}-icon`} className="block text-xs text-muted-foreground">
        Icon (emoji)
      </label>
      <Input
        id={`${idPrefix}-icon`}
        value={form.icon}
        onChange={(e) => onChange({ ...form, icon: e.target.value })}
        className="w-20"
      />
    </div>
  </div>
);

const formForLevel = (level: Level): LevelFormState => ({
  level: String(level.level),
  name: level.name,
  requiredXp: String(level.requiredXp),
  icon: level.icon ?? "",
});

const EditLevelModal = ({ level, onClose }: { level: Level; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LevelFormState>(() => formForLevel(level));
  const [isActive, setIsActive] = useState(level.isActive);
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (input: UpdateLevelInput) => gamificationApi.updateLevel(level.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEVELS_QUERY_KEY });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate({
      name: form.name,
      requiredXp: Number(form.requiredXp),
      ...(form.icon ? { icon: form.icon } : {}),
      isActive,
    });
  };

  return (
    <Modal open onClose={onClose} title="Edit level">
      <form onSubmit={handleSubmit} className="space-y-4">
        <LevelFields
          idPrefix={`edit-level-${level.id}`}
          form={form}
          onChange={setForm}
          levelEditable={false}
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            id={`edit-level-${level.id}-active`}
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

export const LevelsSection = () => {
  const queryClient = useQueryClient();
  const { data: levels, isLoading } = useQuery({
    queryKey: LEVELS_QUERY_KEY,
    queryFn: gamificationApi.listLevels,
  });

  const [form, setForm] = useState<LevelFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);

  const create = useMutation({
    mutationFn: () => gamificationApi.createLevel(toCreateInput(form)),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setError(null);
      queryClient.invalidateQueries({ queryKey: LEVELS_QUERY_KEY });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Levels</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The XP ladder every user climbs. Deactivating a level doesn&apos;t remove it from anyone
        already there — it just stops it from being assigned going forward.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <LevelFields idPrefix="create-level" form={form} onChange={setForm} levelEditable />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Add level"}
        </Button>
      </form>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {levels?.length === 0 && <p className="text-sm text-muted-foreground">No levels yet.</p>}

        {levels?.map((level) => (
          <div
            key={level.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <p className="text-sm text-foreground">
              {level.icon && <span className="mr-1.5">{level.icon}</span>}
              Level {level.level} — {level.name} (requires {level.requiredXp.toLocaleString()} XP)
              {!level.isActive && (
                <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>
              )}
            </p>
            <Button variant="outline" size="sm" onClick={() => setEditingLevel(level)}>
              Edit
            </Button>
          </div>
        ))}
      </div>

      {editingLevel && (
        <EditLevelModal
          key={editingLevel.id}
          level={editingLevel}
          onClose={() => setEditingLevel(null)}
        />
      )}
    </div>
  );
};
