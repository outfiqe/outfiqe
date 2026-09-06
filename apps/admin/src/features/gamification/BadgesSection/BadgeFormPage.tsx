import {
  AchievementBadgeIcon,
  Button,
  Checkbox,
  FormBanner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { type FormEvent, useMemo, useRef, useState } from "react";

import { ConfirmModal } from "@/components/ConfirmModal";
import { getErrorMessage } from "@/lib/errorMessages";

import type { UpdateBadgeFormInput } from "../api";
import { gamificationApi } from "../api";
import { BADGE_DESIGN_MODE, DEFAULT_BADGE_ICON } from "../badgeOptions.constants";
import type { BadgeAdmin } from "../schemas";
import { BadgeDetailsFields } from "./BadgeDetailsFields";
import { BADGES_QUERY_KEY, EMPTY_FORM } from "./badgeForm.constants";
import type { BadgeFormState } from "./badgeForm.types";
import { formForBadge, toFormInput, toPreviewDesignConfig } from "./badgeForm.utils";
import { BadgeDesignSection } from "./DesignStudio/BadgeDesignSection";
import { BADGE_LAYER_TYPE } from "./DesignStudio/studioLayer.constants";

const DUPLICATE_NAME_PREFIX = "Copy of ";
const BADGE_FORM_ID = "badge-form";

const TAB = { DETAILS: "details", DESIGN: "design" } as const;

const badgeQueryKey = (badgeId: string) => ["admin-badge", badgeId];

const describeDesignIncompleteness = (form: BadgeFormState): string | null => {
  if (form.designMode !== BADGE_DESIGN_MODE.STUDIO) return null;
  if (form.studioLayers.length === 0) return "Add at least one layer on the Design tab.";
  const missingImage = form.studioLayers.some(
    (layer) => layer.type === BADGE_LAYER_TYPE.IMAGE && !layer.url,
  );
  return missingImage ? "An image layer on the Design tab has no image yet." : null;
};

const BadgeForm = ({
  mode,
  badge,
  initialForm,
}: {
  mode: "create" | "edit";
  badge: BadgeAdmin | null;
  initialForm: BadgeFormState;
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [form, setForm] = useState<BadgeFormState>(initialForm);
  const [isActive, setIsActive] = useState(badge?.isActive ?? true);
  const [achievementIsActive, setAchievementIsActive] = useState(
    badge?.achievement?.isActive ?? true,
  );
  const [activeTab, setActiveTab] = useState<string>(TAB.DETAILS);
  const [error, setError] = useState<string | null>(null);
  const hasSavedRef = useRef(false);

  const save = useMutation({
    mutationFn: () => {
      if (mode === "edit" && badge) {
        const input: UpdateBadgeFormInput = {
          ...toFormInput(form),
          isActive,
          ...(form.isAdminAward ? {} : { achievementIsActive }),
        };
        return gamificationApi.updateBadge(badge.id, input);
      }
      return gamificationApi.createBadge(toFormInput(form));
    },
    onSuccess: (saved) => {
      hasSavedRef.current = true;
      void queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: badgeQueryKey(saved.id) });
      void navigate({ to: "/gamification/badges" });
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const initialSnapshot = useMemo(
    () => JSON.stringify({ form: initialForm, isActive: badge?.isActive ?? true }),
    [initialForm, badge],
  );
  const isDirty = JSON.stringify({ form, isActive }) !== initialSnapshot;

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty && !hasSavedRef.current,
    enableBeforeUnload: () => isDirty && !hasSavedRef.current,
    withResolver: true,
  });

  const designIssue = describeDesignIncompleteness(form);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (designIssue) {
      setActiveTab(TAB.DESIGN);
      setError(designIssue);
      return;
    }
    setError(null);
    save.mutate();
  };

  const title = mode === "edit" ? (badge?.name ?? "Edit badge") : "New badge";

  return (
    <form id={BADGE_FORM_ID} onSubmit={handleSubmit}>
      <Link
        to="/gamification/badges"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Badges
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <AchievementBadgeIcon
          icon={form.icon || DEFAULT_BADGE_ICON}
          designConfig={toPreviewDesignConfig(form)}
          rarity={form.rarity}
          isLocked={false}
        />
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value={TAB.DETAILS}>Details</TabsTrigger>
          <TabsTrigger value={TAB.DESIGN}>Design</TabsTrigger>
        </TabsList>

        <TabsContent value={TAB.DETAILS} className="mt-4">
          <BadgeDetailsFields idPrefix="badge" form={form} onChange={setForm} />
          {mode === "edit" && (
            <div className="mt-4 space-y-2 rounded-xl border border-border p-4">
              <p className="text-sm font-medium text-foreground">Status</p>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active (listed in the public catalog)
              </label>
              {!form.isAdminAward && (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={achievementIsActive}
                    onChange={(e) => setAchievementIsActive(e.target.checked)}
                  />
                  Engine evaluates this achievement (uncheck to pause auto-unlocking without hiding
                  the badge)
                </label>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value={TAB.DESIGN} className="mt-4">
          <BadgeDesignSection idPrefix="badge" form={form} onChange={setForm} />
        </TabsContent>
      </Tabs>

      <div className="mt-6 space-y-3 border-t border-border pt-4">
        {error && <FormBanner>{error}</FormBanner>}
        {designIssue && !error && <p className="text-sm text-muted-foreground">{designIssue}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to="/gamification/badges">Cancel</Link>
          </Button>
          <Button type="submit" disabled={save.isPending || Boolean(designIssue)}>
            {save.isPending ? "Saving…" : mode === "edit" ? "Save changes" : "Create badge"}
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={blocker.status === "blocked"}
        title="Discard unsaved changes?"
        description="Your changes to this badge haven't been saved."
        confirmLabel="Discard changes"
        destructive
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </form>
  );
};

type BadgeFormPageProps =
  { mode: "create"; duplicateFromId?: string } | { mode: "edit"; badgeId: string };

export const BadgeFormPage = (props: BadgeFormPageProps) => {
  const sourceBadgeId = props.mode === "edit" ? props.badgeId : props.duplicateFromId;

  const badgeQuery = useQuery({
    queryKey: sourceBadgeId ? badgeQueryKey(sourceBadgeId) : ["admin-badge", "none"],
    queryFn: () => gamificationApi.getBadgeAdmin(sourceBadgeId as string),
    enabled: Boolean(sourceBadgeId),
  });

  if (props.mode === "create" && !props.duplicateFromId) {
    return <BadgeForm mode="create" badge={null} initialForm={EMPTY_FORM} />;
  }

  if (badgeQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (badgeQuery.error || !badgeQuery.data) {
    return <p className="text-sm text-destructive">Couldn&apos;t load this badge.</p>;
  }

  if (props.mode === "edit") {
    return (
      <BadgeForm
        key={badgeQuery.data.id}
        mode="edit"
        badge={badgeQuery.data}
        initialForm={formForBadge(badgeQuery.data)}
      />
    );
  }

  const duplicatedForm = formForBadge(badgeQuery.data);
  return (
    <BadgeForm
      key={`duplicate-${badgeQuery.data.id}`}
      mode="create"
      badge={null}
      initialForm={{ ...duplicatedForm, name: `${DUPLICATE_NAME_PREFIX}${duplicatedForm.name}` }}
    />
  );
};

const newRouteApi = getRouteApi("/_authenticated/gamification/badges/new");
const editRouteApi = getRouteApi("/_authenticated/gamification/badges/$badgeId/edit");

export const NewBadgePage = () => {
  const { duplicateFrom } = newRouteApi.useSearch();
  return <BadgeFormPage mode="create" duplicateFromId={duplicateFrom} />;
};

export const EditBadgePage = () => {
  const { badgeId } = editRouteApi.useParams();
  return <BadgeFormPage mode="edit" badgeId={badgeId} />;
};
