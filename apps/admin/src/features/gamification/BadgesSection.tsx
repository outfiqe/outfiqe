import { Button, Checkbox, FormBanner, Input, Modal, Select } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import type { BadgeFormInput, UpdateBadgeFormInput } from "./api";
import { gamificationApi } from "./api";
import type {
  AchievementMetricValue,
  BadgeAdmin,
  BadgeCategoryValue,
  BadgeRarityValue,
  BadgeShapeValue,
  ConditionOperatorValue,
} from "./schemas";

const BADGES_QUERY_KEY = ["admin-badges"];

const CATEGORY_OPTIONS: BadgeCategoryValue[] = [
  "BEGINNER",
  "CREATOR",
  "COMMUNITY",
  "ENGAGEMENT",
  "COMMERCE",
  "SPECIAL",
];
const RARITY_OPTIONS: BadgeRarityValue[] = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "EXCLUSIVE",
];
const SHAPE_OPTIONS: BadgeShapeValue[] = ["circle", "shield", "star", "diamond", "hexagon"];
const RULE_BASED_REQUIREMENT_TYPES = [
  "MILESTONE",
  "ACTIVITY",
  "ENGAGEMENT",
  "COMMERCE",
  "COMMUNITY",
  "LEVEL",
  "SPECIAL",
] as const;
const METRIC_OPTIONS: AchievementMetricValue[] = [
  "level",
  "posts_created",
  "purchases_count",
  "total_likes",
  "comments_made",
  "sales_count",
  "total_views",
];
const OPERATOR_OPTIONS: ConditionOperatorValue[] = ["gte", "gt", "eq", "lte", "lt"];

type ConditionFormState = {
  metric: AchievementMetricValue;
  operator: ConditionOperatorValue;
  value: string;
};

type BadgeFormState = {
  name: string;
  description: string;
  category: BadgeCategoryValue;
  rarity: BadgeRarityValue;
  icon: string;
  shape: BadgeShapeValue;
  primaryColor: string;
  xpReward: string;
  isPermanent: boolean;
  isPublic: boolean;
  isTitleEligible: boolean;
  isAdminAward: boolean;
  assignmentLimit: string;
  requirementType: (typeof RULE_BASED_REQUIREMENT_TYPES)[number];
  conditions: ConditionFormState[];
};

const EMPTY_CONDITION: ConditionFormState = { metric: "total_likes", operator: "gte", value: "" };

const EMPTY_FORM: BadgeFormState = {
  name: "",
  description: "",
  category: "ENGAGEMENT",
  rarity: "COMMON",
  icon: "",
  shape: "circle",
  primaryColor: "#94a3b8",
  xpReward: "0",
  isPermanent: true,
  isPublic: true,
  isTitleEligible: false,
  isAdminAward: false,
  assignmentLimit: "",
  requirementType: "ENGAGEMENT",
  conditions: [EMPTY_CONDITION],
};

const formForBadge = (badge: BadgeAdmin): BadgeFormState => ({
  name: badge.name,
  description: badge.description,
  category: badge.category,
  rarity: badge.rarity,
  icon: badge.icon,
  shape: badge.designConfig.shape,
  primaryColor: badge.designConfig.primaryColor,
  xpReward: String(badge.xpReward),
  isPermanent: badge.isPermanent,
  isPublic: badge.isPublic,
  isTitleEligible: badge.isTitleEligible,
  isAdminAward: badge.achievement?.requirementType === "ADMIN_AWARD",
  assignmentLimit: badge.assignmentLimit === null ? "" : String(badge.assignmentLimit),
  requirementType:
    badge.achievement && badge.achievement.requirementType !== "ADMIN_AWARD"
      ? badge.achievement.requirementType
      : "ENGAGEMENT",
  conditions:
    badge.achievement && badge.achievement.requirementType !== "ADMIN_AWARD"
      ? badge.achievement.requirementConfig.conditions.map((condition) => ({
          metric: condition.metric,
          operator: condition.operator,
          value: String(condition.value),
        }))
      : [EMPTY_CONDITION],
});

const toFormInput = (form: BadgeFormState): BadgeFormInput => ({
  name: form.name,
  description: form.description,
  category: form.category,
  rarity: form.rarity,
  icon: form.icon,
  designConfig: { shape: form.shape, primaryColor: form.primaryColor },
  xpReward: Number(form.xpReward),
  isPermanent: form.isPermanent,
  isPublic: form.isPublic,
  isTitleEligible: form.isTitleEligible,
  assignmentLimit: form.isAdminAward && form.assignmentLimit ? Number(form.assignmentLimit) : null,
  ...(form.isAdminAward
    ? { requirementType: "ADMIN_AWARD" }
    : {
        requirementType: form.requirementType,
        conditions: form.conditions.map((condition) => ({
          metric: condition.metric,
          operator: condition.operator,
          value: Number(condition.value),
        })),
      }),
});

const ConditionsEditor = ({
  idPrefix,
  conditions,
  onChange,
}: {
  idPrefix: string;
  conditions: ConditionFormState[];
  onChange: (conditions: ConditionFormState[]) => void;
}) => (
  <div className="space-y-2">
    <p className="text-xs text-muted-foreground">
      Conditions (all must be met — metric ≥/&gt;/=/≤/&lt; value)
    </p>
    {conditions.map((condition, index) => (
      <div key={index} className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${idPrefix}-metric-${index}`} className="sr-only">
          Metric
        </label>
        <Select
          id={`${idPrefix}-metric-${index}`}
          value={condition.metric}
          onChange={(e) =>
            onChange(
              conditions.map((c, i) =>
                i === index ? { ...c, metric: e.target.value as AchievementMetricValue } : c,
              ),
            )
          }
          className="w-40"
        >
          {METRIC_OPTIONS.map((metric) => (
            <option key={metric} value={metric}>
              {metric}
            </option>
          ))}
        </Select>
        <label htmlFor={`${idPrefix}-operator-${index}`} className="sr-only">
          Operator
        </label>
        <Select
          id={`${idPrefix}-operator-${index}`}
          value={condition.operator}
          onChange={(e) =>
            onChange(
              conditions.map((c, i) =>
                i === index ? { ...c, operator: e.target.value as ConditionOperatorValue } : c,
              ),
            )
          }
          className="w-20"
        >
          {OPERATOR_OPTIONS.map((operator) => (
            <option key={operator} value={operator}>
              {operator}
            </option>
          ))}
        </Select>
        <label htmlFor={`${idPrefix}-value-${index}`} className="sr-only">
          Value
        </label>
        <Input
          id={`${idPrefix}-value-${index}`}
          type="number"
          required
          value={condition.value}
          onChange={(e) =>
            onChange(conditions.map((c, i) => (i === index ? { ...c, value: e.target.value } : c)))
          }
          className="w-28"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={conditions.length <= 1}
          onClick={() => onChange(conditions.filter((_, i) => i !== index))}
        >
          Remove
        </Button>
      </div>
    ))}
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => onChange([...conditions, { ...EMPTY_CONDITION }])}
    >
      Add condition
    </Button>
  </div>
);

const BadgeFields = ({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: BadgeFormState;
  onChange: (form: BadgeFormState) => void;
}) => (
  <div className="space-y-4">
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1 space-y-1.5">
        <label htmlFor={`${idPrefix}-name`} className="block text-xs text-muted-foreground">
          Name
        </label>
        <Input
          id={`${idPrefix}-name`}
          required
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

    <div className="space-y-1.5">
      <label htmlFor={`${idPrefix}-description`} className="block text-xs text-muted-foreground">
        Description
      </label>
      <Input
        id={`${idPrefix}-description`}
        required
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
      />
    </div>

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

    <div className="flex flex-wrap gap-4">
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

    <div className="rounded-xl border border-border p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Checkbox
          checked={form.isAdminAward}
          onChange={(e) => onChange({ ...form, isAdminAward: e.target.checked })}
        />
        Admin-award only (no automatic rule — awarded by hand)
      </label>

      {form.isAdminAward ? (
        <div className="mt-3 space-y-1.5">
          <label
            htmlFor={`${idPrefix}-assignment-limit`}
            className="block text-xs text-muted-foreground"
          >
            Assignment limit (blank = unlimited)
          </label>
          <Input
            id={`${idPrefix}-assignment-limit`}
            type="number"
            min={1}
            placeholder="Unlimited"
            value={form.assignmentLimit}
            onChange={(e) => onChange({ ...form, assignmentLimit: e.target.value })}
            className="w-32"
          />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-requirement-type`}
              className="block text-xs text-muted-foreground"
            >
              Requirement type
            </label>
            <Select
              id={`${idPrefix}-requirement-type`}
              value={form.requirementType}
              onChange={(e) =>
                onChange({
                  ...form,
                  requirementType: e.target.value as BadgeFormState["requirementType"],
                })
              }
              className="w-44"
            >
              {RULE_BASED_REQUIREMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>
          <ConditionsEditor
            idPrefix={`${idPrefix}-condition`}
            conditions={form.conditions}
            onChange={(conditions) => onChange({ ...form, conditions })}
          />
        </div>
      )}
    </div>
  </div>
);

const EditBadgeModal = ({ badge, onClose }: { badge: BadgeAdmin; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BadgeFormState>(() => formForBadge(badge));
  const [isActive, setIsActive] = useState(badge.isActive);
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (input: UpdateBadgeFormInput) => gamificationApi.updateBadge(badge.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate({ ...toFormInput(form), isActive });
  };

  return (
    <Modal open onClose={onClose} title="Edit badge">
      <form onSubmit={handleSubmit} className="space-y-4">
        <BadgeFields idPrefix={`edit-badge-${badge.id}`} form={form} onChange={setForm} />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
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

export const BadgesSection = () => {
  const queryClient = useQueryClient();
  const { data: badges, isLoading } = useQuery({
    queryKey: BADGES_QUERY_KEY,
    queryFn: gamificationApi.listBadgesAdmin,
  });

  const [form, setForm] = useState<BadgeFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [editingBadge, setEditingBadge] = useState<BadgeAdmin | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const create = useMutation({
    mutationFn: () => gamificationApi.createBadge(toFormInput(form)),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setError(null);
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Badges</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The full badge catalog — rule-based and admin-award.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowCreateForm((open) => !open)}>
          {showCreateForm ? "Cancel" : "New badge"}
        </Button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 rounded-xl border border-border bg-card p-4"
        >
          <BadgeFields idPrefix="create-badge" form={form} onChange={setForm} />
          {error && <FormBanner>{error}</FormBanner>}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create badge"}
          </Button>
        </form>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {badges?.length === 0 && <p className="text-sm text-muted-foreground">No badges yet.</p>}

        {badges?.map((badge) => (
          <div key={badge.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {badge.icon} {badge.name}
              </p>
              <Button variant="outline" size="sm" onClick={() => setEditingBadge(badge)}>
                Edit
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {badge.category} · {badge.rarity} · {badge.xpReward} XP
              {!badge.isActive && " · inactive"}
              {badge.achievement?.requirementType === "ADMIN_AWARD" &&
                ` · admin-award${badge.assignmentLimit !== null ? ` (${badge.assignmentCount}/${badge.assignmentLimit})` : ""}`}
              {badge.isTitleEligible && " · title-eligible"}
            </p>
          </div>
        ))}
      </div>

      {editingBadge && (
        <EditBadgeModal
          key={editingBadge.id}
          badge={editingBadge}
          onClose={() => setEditingBadge(null)}
        />
      )}
    </div>
  );
};
