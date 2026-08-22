import { Button, Checkbox, FormBanner, Input, Modal, Select } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import {
  type CreatorCompetitionFormInput,
  gamificationApi,
  type UpdateCreatorCompetitionFormInput,
} from "./api";
import {
  ANIMATION_OPTION_LABEL,
  ANIMATION_OPTIONS,
  AUTO_ANIMATION_OPTION,
  CATEGORY_OPTIONS,
  LEADERBOARD_CATEGORY_LABEL,
  LEADERBOARD_CATEGORY_OPTIONS,
  RARITY_OPTIONS,
  SHAPE_OPTIONS,
} from "./badgeOptions.constants";
import type {
  BadgeAnimationValue,
  BadgeCategoryValue,
  BadgeRarityValue,
  BadgeShapeValue,
  CreatorCompetitionAdmin,
  CreatorLeaderboardCategoryValue,
} from "./schemas";

const COMPETITIONS_QUERY_KEY = ["admin-creator-competitions"];
const MIN_WINNERS = 1;
const MAX_WINNERS = 10;

type CompetitionFormState = {
  name: string;
  category: BadgeCategoryValue;
  rarity: BadgeRarityValue;
  icon: string;
  shape: BadgeShapeValue;
  primaryColor: string;
  animation: BadgeAnimationValue | typeof AUTO_ANIMATION_OPTION;
  xpReward: string;
  isPermanent: boolean;
  isPublic: boolean;
  isTitleEligible: boolean;
  leaderboardCategory: CreatorLeaderboardCategoryValue;
  topN: string;
};

const EMPTY_FORM: CompetitionFormState = {
  name: "",
  category: "SPECIAL",
  rarity: "RARE",
  icon: "🏆",
  shape: "star",
  primaryColor: "#f97316",
  animation: AUTO_ANIMATION_OPTION,
  xpReward: "50",
  isPermanent: true,
  isPublic: true,
  isTitleEligible: false,
  leaderboardCategory: "MOST_LIKES",
  topN: "3",
};

const toFormInput = (form: CompetitionFormState): CreatorCompetitionFormInput => ({
  name: form.name,
  description: `Awarded weekly to the top ${form.topN} in ${LEADERBOARD_CATEGORY_LABEL[form.leaderboardCategory]}.`,
  category: form.category,
  rarity: form.rarity,
  icon: form.icon,
  designConfig: {
    shape: form.shape,
    primaryColor: form.primaryColor,
    ...(form.animation === AUTO_ANIMATION_OPTION ? {} : { animation: form.animation }),
  },
  xpReward: Number(form.xpReward),
  isPermanent: form.isPermanent,
  isPublic: form.isPublic,
  isTitleEligible: form.isTitleEligible,
  leaderboardCategory: form.leaderboardCategory,
  topN: Number(form.topN),
});

const formForCompetition = (competition: CreatorCompetitionAdmin): CompetitionFormState => ({
  name: competition.name,
  category: competition.badge.category,
  rarity: competition.badge.rarity,
  icon: competition.badge.icon,
  shape: competition.badge.designConfig.shape,
  primaryColor: competition.badge.designConfig.primaryColor,
  animation: competition.badge.designConfig.animation ?? AUTO_ANIMATION_OPTION,
  xpReward: String(competition.badge.xpReward),
  isPermanent: competition.badge.isPermanent,
  isPublic: competition.badge.isPublic,
  isTitleEligible: competition.badge.isTitleEligible,
  leaderboardCategory: competition.category,
  topN: String(competition.topN),
});

const CompetitionFields = ({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: CompetitionFormState;
  onChange: (form: CompetitionFormState) => void;
}) => (
  <div className="space-y-4">
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1 space-y-1.5">
        <label htmlFor={`${idPrefix}-name`} className="block text-xs text-muted-foreground">
          Competition name
        </label>
        <Input
          id={`${idPrefix}-name`}
          required
          placeholder="Weekly Style Sprint"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-icon`} className="block text-xs text-muted-foreground">
          Icon (emoji)
        </label>
        <Input
          id={`${idPrefix}-icon`}
          required
          value={form.icon}
          onChange={(e) => onChange({ ...form, icon: e.target.value })}
          className="w-20"
        />
      </div>
    </div>

    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-leaderboard-category`}
          className="block text-xs text-muted-foreground"
        >
          Ranks by
        </label>
        <Select
          id={`${idPrefix}-leaderboard-category`}
          value={form.leaderboardCategory}
          onChange={(e) =>
            onChange({
              ...form,
              leaderboardCategory: e.target.value as CreatorLeaderboardCategoryValue,
            })
          }
          className="w-40"
        >
          {LEADERBOARD_CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {LEADERBOARD_CATEGORY_LABEL[category]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-top-n`} className="block text-xs text-muted-foreground">
          Winners each week
        </label>
        <Input
          id={`${idPrefix}-top-n`}
          type="number"
          required
          min={MIN_WINNERS}
          max={MAX_WINNERS}
          value={form.topN}
          onChange={(e) => onChange({ ...form, topN: e.target.value })}
          className="w-24"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-xp-reward`} className="block text-xs text-muted-foreground">
          XP reward
        </label>
        <Input
          id={`${idPrefix}-xp-reward`}
          type="number"
          min={0}
          value={form.xpReward}
          onChange={(e) => onChange({ ...form, xpReward: e.target.value })}
          className="w-24"
        />
      </div>
    </div>

    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-sm font-medium text-foreground">Trophy badge</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-category`} className="block text-xs text-muted-foreground">
            Category
          </label>
          <Select
            id={`${idPrefix}-category`}
            value={form.category}
            onChange={(e) => onChange({ ...form, category: e.target.value as BadgeCategoryValue })}
            className="w-36"
          >
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-rarity`} className="block text-xs text-muted-foreground">
            Rarity
          </label>
          <Select
            id={`${idPrefix}-rarity`}
            value={form.rarity}
            onChange={(e) => onChange({ ...form, rarity: e.target.value as BadgeRarityValue })}
            className="w-36"
          >
            {RARITY_OPTIONS.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-shape`} className="block text-xs text-muted-foreground">
            Shape
          </label>
          <Select
            id={`${idPrefix}-shape`}
            value={form.shape}
            onChange={(e) => onChange({ ...form, shape: e.target.value as BadgeShapeValue })}
            className="w-32"
          >
            {SHAPE_OPTIONS.map((shape) => (
              <option key={shape} value={shape}>
                {shape}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-color`} className="block text-xs text-muted-foreground">
            Color
          </label>
          <Input
            id={`${idPrefix}-color`}
            type="color"
            value={form.primaryColor}
            onChange={(e) => onChange({ ...form, primaryColor: e.target.value })}
            className="h-11 w-16 p-1"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-animation`} className="block text-xs text-muted-foreground">
            Animation
          </label>
          <Select
            id={`${idPrefix}-animation`}
            value={form.animation}
            onChange={(e) =>
              onChange({ ...form, animation: e.target.value as CompetitionFormState["animation"] })
            }
            className="w-36"
          >
            <option value={AUTO_ANIMATION_OPTION}>Auto (by rarity)</option>
            {ANIMATION_OPTIONS.map((animation) => (
              <option key={animation} value={animation}>
                {ANIMATION_OPTION_LABEL[animation]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={form.isPermanent}
            onChange={(e) => onChange({ ...form, isPermanent: e.target.checked })}
          />
          Permanent
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={form.isPublic}
            onChange={(e) => onChange({ ...form, isPublic: e.target.checked })}
          />
          Visible while locked
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={form.isTitleEligible}
            onChange={(e) => onChange({ ...form, isTitleEligible: e.target.checked })}
          />
          Title-eligible
        </label>
      </div>
    </div>
  </div>
);

const EditCompetitionModal = ({
  competition,
  onClose,
}: {
  competition: CreatorCompetitionAdmin;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CompetitionFormState>(() => formForCompetition(competition));
  const [isActive, setIsActive] = useState(competition.isActive);
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (input: UpdateCreatorCompetitionFormInput) =>
      gamificationApi.updateCreatorCompetition(competition.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPETITIONS_QUERY_KEY });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate({ ...toFormInput(form), isActive });
  };

  return (
    <Modal open onClose={onClose} title="Edit competition">
      <form onSubmit={handleSubmit} className="space-y-4">
        <CompetitionFields
          idPrefix={`edit-competition-${competition.id}`}
          form={form}
          onChange={setForm}
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            id={`edit-competition-${competition.id}-active`}
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

export const CompetitionsSection = () => {
  const queryClient = useQueryClient();
  const { data: competitions, isLoading } = useQuery({
    queryKey: COMPETITIONS_QUERY_KEY,
    queryFn: gamificationApi.listCreatorCompetitionsAdmin,
  });

  const [form, setForm] = useState<CompetitionFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [editingCompetition, setEditingCompetition] = useState<CreatorCompetitionAdmin | null>(
    null,
  );

  const create = useMutation({
    mutationFn: () => gamificationApi.createCreatorCompetition(toFormInput(form)),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setError(null);
      queryClient.invalidateQueries({ queryKey: COMPETITIONS_QUERY_KEY });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Creator competitions</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        An ongoing weekly rule, not a one-off event — the top finishers in a leaderboard category
        win the trophy badge automatically every week, settled the moment each ISO week ends.
        Deactivating a competition stops future settlements without taking back badges already won.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-4 space-y-4 rounded-xl border border-border bg-card p-4"
      >
        <CompetitionFields idPrefix="create-competition" form={form} onChange={setForm} />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create competition"}
        </Button>
      </form>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {competitions?.length === 0 && (
          <p className="text-sm text-muted-foreground">No competitions yet.</p>
        )}

        {competitions?.map((competition) => (
          <div key={competition.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {competition.badge.icon} {competition.name}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingCompetition(competition)}
              >
                Edit
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Top {competition.topN} in {LEADERBOARD_CATEGORY_LABEL[competition.category]}
              {" · "}
              {competition.badge.xpReward} XP
              {!competition.isActive && " · deactivated"}
            </p>
          </div>
        ))}
      </div>

      {editingCompetition && (
        <EditCompetitionModal
          key={editingCompetition.id}
          competition={editingCompetition}
          onClose={() => setEditingCompetition(null)}
        />
      )}
    </div>
  );
};
