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
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { ActionRowSkeleton } from "@/components/ActionRowSkeleton";
import { usePlatformPermissions } from "@/features/auth/usePlatformPermissions";
import { getErrorMessage } from "@/lib/errorMessages";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { type CreateLevelInput, gamificationApi, type UpdateLevelInput } from "./api";
import { EMPTY_LEVEL_FORM, levelFormSchema, type LevelFormValues } from "./levelForm.schema";
import type { Level } from "./schemas";

const LEVELS_QUERY_KEY = ["admin-levels"];

const toCreateInput = (values: LevelFormValues): CreateLevelInput => ({
  level: Number(values.level),
  name: values.name,
  requiredXp: Number(values.requiredXp),
  ...(values.icon ? { icon: values.icon } : {}),
});

const LevelFields = ({
  form,
  levelEditable,
}: {
  form: UseFormReturn<LevelFormValues>;
  levelEditable: boolean;
}) => (
  <div className="flex flex-wrap items-start gap-3">
    <FormField
      control={form.control}
      name="level"
      render={({ field }) => (
        <FormItem className="mt-0 w-24 space-y-1.5">
          <FormLabel className="text-xs font-normal text-muted-foreground">Level number</FormLabel>
          <FormControl>
            <Input inputMode="numeric" disabled={!levelEditable} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem className="mt-0 w-48 space-y-1.5">
          <FormLabel className="text-xs font-normal text-muted-foreground">Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="requiredXp"
      render={({ field }) => (
        <FormItem className="mt-0 w-32 space-y-1.5">
          <FormLabel className="text-xs font-normal text-muted-foreground">Required XP</FormLabel>
          <FormControl>
            <Input inputMode="numeric" {...field} />
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
          <FormLabel className="text-xs font-normal text-muted-foreground">Icon (emoji)</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

const formForLevel = (level: Level): LevelFormValues => ({
  level: String(level.level),
  name: level.name,
  requiredXp: String(level.requiredXp),
  icon: level.icon ?? "",
});

const EditLevelModal = ({ level, onClose }: { level: Level; onClose: () => void }) => {
  const [isActive, setIsActive] = useState(level.isActive);
  const form = useForm<LevelFormValues>({
    resolver: zodResolver(levelFormSchema),
    defaultValues: formForLevel(level),
    mode: "onTouched",
  });

  const update = useApiMutation({
    mutationFn: (input: UpdateLevelInput) => gamificationApi.updateLevel(level.id, input),
    invalidateKeys: [LEVELS_QUERY_KEY],
    successMessage: "Level updated.",
    onSuccess: () => onClose(),
  });

  const submitLevelEdit = form.handleSubmit((values) =>
    update.mutate({
      name: values.name,
      requiredXp: Number(values.requiredXp),
      ...(values.icon ? { icon: values.icon } : {}),
      isActive,
    }),
  );

  return (
    <Modal open onClose={onClose} title="Edit level">
      <Form {...form}>
        <form onSubmit={submitLevelEdit} noValidate className="space-y-4">
          <LevelFields form={form} levelEditable={false} />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              id={`edit-level-${level.id}-active`}
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

export const LevelsSection = () => {
  const { canUse } = usePlatformPermissions();
  const canManageGamification = canUse(PLATFORM_MANAGE_PERMISSION.GAMIFICATION);
  const { data: levels, isLoading } = useQuery({
    queryKey: LEVELS_QUERY_KEY,
    queryFn: gamificationApi.listLevels,
  });

  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const form = useForm<LevelFormValues>({
    resolver: zodResolver(levelFormSchema),
    defaultValues: EMPTY_LEVEL_FORM,
    mode: "onTouched",
  });

  const create = useApiMutation({
    mutationFn: (values: LevelFormValues) => gamificationApi.createLevel(toCreateInput(values)),
    invalidateKeys: [LEVELS_QUERY_KEY],
    successMessage: "Level added.",
    onSuccess: () => form.reset(EMPTY_LEVEL_FORM),
  });

  const submitLevel = form.handleSubmit((values) => create.mutate(values));

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Levels</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The XP ladder every user climbs. Deactivating a level doesn&apos;t remove it from anyone
        already there — it just stops it from being assigned going forward.
      </p>

      {canManageGamification && (
        <Form {...form}>
          <form
            onSubmit={submitLevel}
            noValidate
            className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <LevelFields form={form} levelEditable />
            <Button type="submit" isLoading={create.isPending} className="mt-[22px]">
              Add level
            </Button>
          </form>
        </Form>
      )}

      {create.isError && <FormBanner className="mt-3">{getErrorMessage(create.error)}</FormBanner>}

      <div className="mt-4 space-y-2">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => <ActionRowSkeleton key={index} />)}
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
            {canManageGamification && (
              <Button variant="outline" size="sm" onClick={() => setEditingLevel(level)}>
                Edit
              </Button>
            )}
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
