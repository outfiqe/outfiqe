import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Checkbox,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Modal,
  Select,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { usePlatformPermissions } from "@/features/auth/usePlatformPermissions";
import { getErrorMessage } from "@/lib/errorMessages";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

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
import {
  competitionFormSchema,
  type CompetitionFormValues,
  EMPTY_COMPETITION_FORM,
} from "./competitionForm.schema";
import { legacyShapeAndColorOf } from "./designConfig.utils";
import type { CreatorCompetitionAdmin } from "./schemas";
import { TitleActionCardSkeleton } from "./skeletons";

const COMPETITIONS_QUERY_KEY = ["admin-creator-competitions"];

const toFormInput = (values: CompetitionFormValues): CreatorCompetitionFormInput => ({
  name: values.name,
  description: `Awarded weekly to the top ${values.topN} in ${LEADERBOARD_CATEGORY_LABEL[values.leaderboardCategory]}.`,
  category: values.category,
  rarity: values.rarity,
  icon: values.icon,
  designConfig: {
    shape: values.shape,
    primaryColor: values.primaryColor,
    ...(values.animation === AUTO_ANIMATION_OPTION ? {} : { animation: values.animation }),
  },
  xpReward: Number(values.xpReward),
  isPermanent: values.isPermanent,
  isPublic: values.isPublic,
  isTitleEligible: values.isTitleEligible,
  leaderboardCategory: values.leaderboardCategory,
  topN: Number(values.topN),
});

const formForCompetition = (competition: CreatorCompetitionAdmin): CompetitionFormValues => ({
  name: competition.name,
  category: competition.badge.category,
  rarity: competition.badge.rarity,
  icon: competition.badge.icon,
  ...legacyShapeAndColorOf(competition.badge.designConfig),
  animation: competition.badge.designConfig.animation ?? AUTO_ANIMATION_OPTION,
  xpReward: String(competition.badge.xpReward),
  isPermanent: competition.badge.isPermanent,
  isPublic: competition.badge.isPublic,
  isTitleEligible: competition.badge.isTitleEligible,
  leaderboardCategory: competition.category,
  topN: String(competition.topN),
});

type CompetitionCheckboxName = "isPermanent" | "isPublic" | "isTitleEligible";

const CompetitionCheckbox = ({
  form,
  name,
  label,
}: {
  form: UseFormReturn<CompetitionFormValues>;
  name: CompetitionCheckboxName;
  label: string;
}) => (
  <label className="flex items-center gap-2 text-sm text-foreground">
    <Checkbox {...form.register(name)} />
    {label}
  </label>
);

const CompetitionFields = ({ form }: { form: UseFormReturn<CompetitionFormValues> }) => (
  <div className="space-y-4">
    <div className="flex flex-wrap items-start gap-3">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="mt-0 min-w-48 flex-1 space-y-1.5">
            <FormLabel className="text-xs font-normal text-muted-foreground">
              Competition name
            </FormLabel>
            <FormControl>
              <Input placeholder="Weekly Style Sprint" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="icon"
        render={({ field }) => (
          <FormItem className="mt-0 w-24 space-y-1.5">
            <FormLabel className="text-xs font-normal text-muted-foreground">
              Icon (emoji)
            </FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <div className="flex flex-wrap items-start gap-3">
      <FormField
        control={form.control}
        name="leaderboardCategory"
        render={({ field }) => (
          <FormItem className="mt-0 w-40 space-y-1.5">
            <FormLabel className="text-xs font-normal text-muted-foreground">Ranks by</FormLabel>
            <FormControl>
              <Select {...field}>
                {LEADERBOARD_CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {LEADERBOARD_CATEGORY_LABEL[category]}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="topN"
        render={({ field }) => (
          <FormItem className="mt-0 w-28 space-y-1.5">
            <FormLabel className="text-xs font-normal text-muted-foreground">
              Winners each week
            </FormLabel>
            <FormControl>
              <Input inputMode="numeric" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="xpReward"
        render={({ field }) => (
          <FormItem className="mt-0 w-28 space-y-1.5">
            <FormLabel className="text-xs font-normal text-muted-foreground">XP reward</FormLabel>
            <FormControl>
              <Input inputMode="numeric" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-sm font-medium text-foreground">Trophy badge</p>
      <div className="flex flex-wrap items-start gap-3">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="mt-0 w-36 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">Category</FormLabel>
              <FormControl>
                <Select {...field}>
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rarity"
          render={({ field }) => (
            <FormItem className="mt-0 w-36 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">Rarity</FormLabel>
              <FormControl>
                <Select {...field}>
                  {RARITY_OPTIONS.map((rarity) => (
                    <option key={rarity} value={rarity}>
                      {rarity}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="shape"
          render={({ field }) => (
            <FormItem className="mt-0 w-32 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">Shape</FormLabel>
              <FormControl>
                <Select {...field}>
                  {SHAPE_OPTIONS.map((shape) => (
                    <option key={shape} value={shape}>
                      {shape}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="primaryColor"
          render={({ field }) => (
            <FormItem className="mt-0 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">Color</FormLabel>
              <FormControl>
                <Input type="color" className="h-11 w-16 p-1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="animation"
          render={({ field }) => (
            <FormItem className="mt-0 w-36 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">Animation</FormLabel>
              <FormControl>
                <Select {...field}>
                  <option value={AUTO_ANIMATION_OPTION}>Auto (by rarity)</option>
                  {ANIMATION_OPTIONS.map((animation) => (
                    <option key={animation} value={animation}>
                      {ANIMATION_OPTION_LABEL[animation]}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        <CompetitionCheckbox form={form} name="isPermanent" label="Permanent" />
        <CompetitionCheckbox form={form} name="isPublic" label="Visible while locked" />
        <CompetitionCheckbox form={form} name="isTitleEligible" label="Title-eligible" />
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
  const [isActive, setIsActive] = useState(competition.isActive);
  const form = useForm<CompetitionFormValues>({
    resolver: zodResolver(competitionFormSchema),
    defaultValues: formForCompetition(competition),
    mode: "onTouched",
  });

  const update = useApiMutation({
    mutationFn: (input: UpdateCreatorCompetitionFormInput) =>
      gamificationApi.updateCreatorCompetition(competition.id, input),
    invalidateKeys: [COMPETITIONS_QUERY_KEY],
    successMessage: "Competition updated.",
    onSuccess: () => onClose(),
  });

  const submitCompetitionEdit = form.handleSubmit((values) =>
    update.mutate({ ...toFormInput(values), isActive }),
  );

  return (
    <Modal open onClose={onClose} title="Edit competition">
      <Form {...form}>
        <form onSubmit={submitCompetitionEdit} noValidate className="space-y-4">
          <CompetitionFields form={form} />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              id={`edit-competition-${competition.id}-active`}
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active
          </label>
          {update.isError && <FormBanner>{getErrorMessage(update.error)}</FormBanner>}
          <Button type="submit" isLoading={update.isPending}>
            Save changes
          </Button>
        </form>
      </Form>
    </Modal>
  );
};

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
      <h2 className="font-display text-lg font-bold text-foreground">Creator competitions</h2>
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
