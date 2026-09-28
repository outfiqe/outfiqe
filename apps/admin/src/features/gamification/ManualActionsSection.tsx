import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  toast,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ActionRowSkeleton } from "@/components/ActionRowSkeleton";
import { TextPromptModal } from "@/components/TextPromptModal";
import { usePlatformPermissions } from "@/features/auth/usePlatformPermissions";
import { getErrorMessage } from "@/lib/errorMessages";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { gamificationApi } from "./api";
import {
  adjustXpFormSchema,
  type AdjustXpFormValues,
  awardBadgeFormSchema,
  type AwardBadgeFormValues,
  EMPTY_ADJUST_XP_FORM,
  EMPTY_AWARD_BADGE_FORM,
} from "./manualActionForm.schema";
import { UserSearchField } from "./UserSearchField";

const BADGES_QUERY_KEY = ["admin-badges"];
const MANUAL_AWARDS_QUERY_KEY = ["admin-manual-awards"];

const AwardBadgeForm = () => {
  const { data: badges } = useQuery({
    queryKey: BADGES_QUERY_KEY,
    queryFn: gamificationApi.listBadgesAdmin,
  });
  const activeBadges = badges?.filter((badge) => badge.isActive) ?? [];

  const [declinedReason, setDeclinedReason] = useState<string | null>(null);
  const form = useForm<AwardBadgeFormValues>({
    resolver: zodResolver(awardBadgeFormSchema),
    defaultValues: EMPTY_AWARD_BADGE_FORM,
    mode: "onTouched",
  });

  const award = useApiMutation({
    mutationFn: ({ badgeId, recipient, reason }: AwardBadgeFormValues) =>
      gamificationApi.awardBadge(badgeId, recipient?.id ?? "", reason),
    invalidateKeys: (result) =>
      result.awarded ? [MANUAL_AWARDS_QUERY_KEY, ["admin-badge-stats"]] : [],
    onSuccess: (result) => {
      if (!result.awarded) {
        setDeclinedReason(result.reason);
        return;
      }
      setDeclinedReason(null);
      form.reset(EMPTY_AWARD_BADGE_FORM);
      toast.success("Badge awarded.");
    },
  });

  const submitAward = form.handleSubmit((values) => {
    setDeclinedReason(null);
    award.mutate(values);
  });
  const bannerMessage = declinedReason ?? (award.isError ? getErrorMessage(award.error) : null);

  return (
    <Form {...form}>
      <form
        onSubmit={submitAward}
        noValidate
        className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
      >
        <FormField
          control={form.control}
          name="badgeId"
          render={({ field }) => (
            <FormItem className="mt-0 w-full space-y-1.5 sm:w-56">
              <FormLabel className="text-xs font-normal text-muted-foreground">Badge</FormLabel>
              <FormControl>
                <Select {...field} className="w-full">
                  <option value="">Select a badge…</option>
                  {activeBadges.map((badge) => (
                    <option key={badge.id} value={badge.id}>
                      {badge.icon} {badge.name}
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
          name="recipient"
          render={({ field }) => (
            <FormItem className="mt-0 w-full sm:w-72">
              <UserSearchField
                id="award-user"
                label="User"
                value={field.value}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem className="mt-0 min-w-0 flex-1 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">Reason</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" isLoading={award.isPending} className="mt-[22px]">
          Award badge
        </Button>
        {bannerMessage && <FormBanner className="w-full">{bannerMessage}</FormBanner>}
      </form>
    </Form>
  );
};

const AdjustXpForm = () => {
  const [declinedReason, setDeclinedReason] = useState<string | null>(null);
  const [adjustmentSummary, setAdjustmentSummary] = useState<string | null>(null);
  const form = useForm<AdjustXpFormValues>({
    resolver: zodResolver(adjustXpFormSchema),
    defaultValues: EMPTY_ADJUST_XP_FORM,
    mode: "onTouched",
  });

  const adjust = useApiMutation({
    mutationFn: ({ target, amount, reason }: AdjustXpFormValues) =>
      gamificationApi.adjustXp(target?.id ?? "", Number(amount), reason),
    onSuccess: (outcome) => {
      if (!outcome.awarded) {
        setDeclinedReason(outcome.reason);
        setAdjustmentSummary(null);
        return;
      }
      setDeclinedReason(null);
      setAdjustmentSummary(
        `New total: ${outcome.totalXp} XP${outcome.leveledUp ? ` — leveled up to Level ${outcome.currentLevel.level} (${outcome.currentLevel.name})!` : ""}`,
      );
      form.reset(EMPTY_ADJUST_XP_FORM);
      toast.success("XP adjusted.");
    },
  });

  const submitAdjustment = form.handleSubmit((values) => {
    setDeclinedReason(null);
    setAdjustmentSummary(null);
    adjust.mutate(values);
  });
  const bannerMessage = declinedReason ?? (adjust.isError ? getErrorMessage(adjust.error) : null);

  return (
    <Form {...form}>
      <form
        onSubmit={submitAdjustment}
        noValidate
        className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
      >
        <FormField
          control={form.control}
          name="target"
          render={({ field }) => (
            <FormItem className="mt-0 w-full sm:w-72">
              <UserSearchField
                id="adjust-xp-user"
                label="User"
                value={field.value}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="mt-0 w-full space-y-1.5 sm:w-32">
              <FormLabel className="text-xs font-normal text-muted-foreground">
                Amount (negative to dock XP)
              </FormLabel>
              <FormControl>
                <Input inputMode="numeric" className="w-full" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem className="mt-0 min-w-0 flex-1 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">Reason</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" isLoading={adjust.isPending} className="mt-[22px]">
          Adjust XP
        </Button>
        {bannerMessage && <FormBanner className="w-full">{bannerMessage}</FormBanner>}
        {adjustmentSummary && (
          <p className="w-full text-sm text-muted-foreground">{adjustmentSummary}</p>
        )}
      </form>
    </Form>
  );
};

const ManualAwardsList = ({ canRemoveAwards }: { canRemoveAwards: boolean }) => {
  const { data: awards, isLoading } = useQuery({
    queryKey: MANUAL_AWARDS_QUERY_KEY,
    queryFn: gamificationApi.listManualAwards,
  });

  const [removeTarget, setRemoveTarget] = useState<{ userBadgeId: string; label: string } | null>(
    null,
  );

  const remove = useApiMutation({
    mutationFn: ({ userBadgeId, reason }: { userBadgeId: string; reason: string }) =>
      gamificationApi.removeUserBadge(userBadgeId, reason),
    invalidateKeys: [MANUAL_AWARDS_QUERY_KEY, ["admin-badge-stats"]],
    successMessage: "Manual award removed.",
    onSuccess: () => setRemoveTarget(null),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="mt-4 space-y-2">
      {isLoading &&
        Array.from({ length: 3 }).map((_, index) => (
          <ActionRowSkeleton key={index} actionLabel="Remove" />
        ))}
      {awards?.length === 0 && (
        <p className="text-sm text-muted-foreground">No manual awards yet.</p>
      )}

      {awards?.map((award) => (
        <div
          key={award.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
        >
          <p className="text-sm text-foreground">
            {award.badgeIcon} {award.badgeName} → {award.userName} (@{award.userHandle})
            {award.awardReason && (
              <span className="block text-xs text-muted-foreground">{award.awardReason}</span>
            )}
          </p>
          {canRemoveAwards && (
            <Button
              variant="ghost"
              size="sm"
              disabled={remove.isPending}
              onClick={() =>
                setRemoveTarget({
                  userBadgeId: award.id,
                  label: `${award.badgeName} → ${award.userName}`,
                })
              }
            >
              Remove
            </Button>
          )}
        </div>
      ))}

      <TextPromptModal
        open={removeTarget !== null}
        title="Remove manual award"
        label={removeTarget ? `Reason for removing "${removeTarget.label}"` : ""}
        requiredMessage="Enter a reason for removing this award."
        confirmLabel="Remove"
        pendingLabel="Removing…"
        isPending={remove.isPending}
        onConfirm={(reason) => {
          if (removeTarget) remove.mutate({ userBadgeId: removeTarget.userBadgeId, reason });
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
};

export const ManualActionsSection = () => {
  const { canUse } = usePlatformPermissions();
  const canAwardBadges = canUse(PLATFORM_MANAGE_PERMISSION.GAMIFICATION);
  const canAdjustXp = canUse(PLATFORM_MANAGE_PERMISSION.XP_ADJUSTMENTS);

  return (
    <div className="space-y-6">
      {canAwardBadges && (
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Manual award</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hand-award a badge to a specific user, with a mandatory reason for the audit trail.
          </p>
          <div className="mt-4">
            <AwardBadgeForm />
          </div>
        </div>
      )}

      {canAdjustXp && (
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Manual XP adjustment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Grant or dock XP for a specific user. Docking below zero is rejected.
          </p>
          <div className="mt-4">
            <AdjustXpForm />
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Manually awarded badges</h2>
        <ManualAwardsList canRemoveAwards={canAwardBadges} />
      </div>
    </div>
  );
};
