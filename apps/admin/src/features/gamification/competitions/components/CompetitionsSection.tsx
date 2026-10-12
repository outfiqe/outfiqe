import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, FormBanner } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { getErrorMessage } from "@/lib/errorMessages";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { gamificationApi } from "../../api/gamificationApi";
import type { CreatorCompetitionAdmin } from "../../api/gamificationSchemas";
import { TitleActionCardSkeleton } from "../../components/GamificationSkeletons";
import { LEADERBOARD_CATEGORY_LABEL } from "../../constants/badgeOptions.constants";
import { COMPETITIONS_QUERY_KEY } from "../constants/competitions.constants";
import {
  competitionFormSchema,
  type CompetitionFormValues,
  EMPTY_COMPETITION_FORM,
} from "../schemas/competitionForm.schema";
import { toFormInput } from "../utils/competitionForm.utils";
import { CompetitionFields } from "./CompetitionFields";
import { EditCompetitionModal } from "./EditCompetitionModal";

export const CompetitionsSection = () => {
  const { canUse } = usePlatformPermissions();
  const canManageGamification = canUse(PLATFORM_MANAGE_PERMISSION.GAMIFICATION);
  const { data: competitions, isLoading } = useQuery({
    queryKey: COMPETITIONS_QUERY_KEY,
    queryFn: gamificationApi.listCreatorCompetitionsAdmin,
  });

  const [editingCompetition, setEditingCompetition] = useState<CreatorCompetitionAdmin | null>(
    null,
  );
  const form = useForm<CompetitionFormValues>({
    resolver: zodResolver(competitionFormSchema),
    defaultValues: EMPTY_COMPETITION_FORM,
    mode: "onTouched",
  });

  const create = useApiMutation({
    mutationFn: (values: CompetitionFormValues) =>
      gamificationApi.createCreatorCompetition(toFormInput(values)),
    invalidateKeys: [COMPETITIONS_QUERY_KEY],
    successMessage: "Competition created.",
    onSuccess: () => form.reset(EMPTY_COMPETITION_FORM),
  });

  const submitCompetition = form.handleSubmit((values) => create.mutate(values));

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Muse competitions</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        An ongoing weekly rule, not a one-off event — the top finishers in a leaderboard category
        win the trophy badge automatically every week, settled the moment each ISO week ends.
        Deactivating a competition stops future settlements without taking back badges already won.
      </p>

      {canManageGamification && (
        <Form {...form}>
          <form
            onSubmit={submitCompetition}
            noValidate
            className="mt-4 space-y-4 rounded-xl border border-border bg-card p-4"
          >
            <CompetitionFields form={form} />
            <Button type="submit" isLoading={create.isPending}>
              Create competition
            </Button>
          </form>
        </Form>
      )}

      {create.isError && <FormBanner className="mt-3">{getErrorMessage(create.error)}</FormBanner>}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => <TitleActionCardSkeleton key={index} />)}
        {competitions?.length === 0 && (
          <p className="text-sm text-muted-foreground">No competitions yet.</p>
        )}

        {competitions?.map((competition) => (
          <div key={competition.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {competition.badge.icon} {competition.name}
              </p>
              {canManageGamification && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCompetition(competition)}
                >
                  Edit
                </Button>
              )}
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
