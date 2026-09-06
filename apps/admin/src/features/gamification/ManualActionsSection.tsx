import { Button, FormBanner, Input, Select, toast } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { TextPromptModal } from "@/components/TextPromptModal";
import { getErrorMessage } from "@/lib/errorMessages";

import { gamificationApi } from "./api";
import { type SelectedUser, UserSearchField } from "./UserSearchField";

const BADGES_QUERY_KEY = ["admin-badges"];
const MANUAL_AWARDS_QUERY_KEY = ["admin-manual-awards"];

const AwardBadgeForm = () => {
  const queryClient = useQueryClient();
  const { data: badges } = useQuery({
    queryKey: BADGES_QUERY_KEY,
    queryFn: gamificationApi.listBadgesAdmin,
  });
  const activeBadges = badges?.filter((badge) => badge.isActive) ?? [];

  const [badgeId, setBadgeId] = useState("");
  const [recipient, setRecipient] = useState<SelectedUser | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const award = useMutation({
    mutationFn: (recipientId: string) => gamificationApi.awardBadge(badgeId, recipientId, reason),
    onSuccess: (result) => {
      if (!result.awarded) {
        setError(result.reason);
        return;
      }
      setRecipient(null);
      setReason("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: MANUAL_AWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-badge-stats"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (recipient) award.mutate(recipient.id);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="w-full space-y-1.5 sm:w-56">
        <label htmlFor="award-badge-select" className="block text-xs text-muted-foreground">
          Badge
        </label>
        <Select
          id="award-badge-select"
          required
          value={badgeId}
          onChange={(e) => setBadgeId(e.target.value)}
          className="w-full"
        >
          <option value="" disabled>
            Select a badge…
          </option>
          {activeBadges.map((badge) => (
            <option key={badge.id} value={badge.id}>
              {badge.icon} {badge.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full sm:w-72">
        <UserSearchField id="award-user" label="User" value={recipient} onChange={setRecipient} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <label htmlFor="award-reason" className="block text-xs text-muted-foreground">
          Reason
        </label>
        <Input
          id="award-reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={award.isPending || !recipient || !badgeId}>
        {award.isPending ? "Awarding…" : "Award badge"}
      </Button>
      {error && <FormBanner className="w-full">{error}</FormBanner>}
    </form>
  );
};

const AdjustXpForm = () => {
  const [target, setTarget] = useState<SelectedUser | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const adjust = useMutation({
    mutationFn: (targetId: string) => gamificationApi.adjustXp(targetId, Number(amount), reason),
    onSuccess: (outcome) => {
      if (!outcome.awarded) {
        setError(outcome.reason);
        setResult(null);
        return;
      }
      setError(null);
      setResult(
        `New total: ${outcome.totalXp} XP${outcome.leveledUp ? ` — leveled up to Level ${outcome.currentLevel.level} (${outcome.currentLevel.name})!` : ""}`,
      );
      setTarget(null);
      setAmount("");
      setReason("");
    },
    onError: (err) => {
      setResult(null);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (target) adjust.mutate(target.id);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="w-full sm:w-72">
        <UserSearchField id="adjust-xp-user" label="User" value={target} onChange={setTarget} />
      </div>
      <div className="w-full space-y-1.5 sm:w-32">
        <label htmlFor="adjust-xp-amount" className="block text-xs text-muted-foreground">
          Amount (negative to dock XP)
        </label>
        <Input
          id="adjust-xp-amount"
          type="number"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <label htmlFor="adjust-xp-reason" className="block text-xs text-muted-foreground">
          Reason
        </label>
        <Input
          id="adjust-xp-reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={adjust.isPending || !target}>
        {adjust.isPending ? "Adjusting…" : "Adjust XP"}
      </Button>
      {error && <FormBanner className="w-full">{error}</FormBanner>}
      {result && <p className="w-full text-sm text-muted-foreground">{result}</p>}
    </form>
  );
};

const ManualAwardsList = () => {
  const queryClient = useQueryClient();
  const { data: awards, isLoading } = useQuery({
    queryKey: MANUAL_AWARDS_QUERY_KEY,
    queryFn: gamificationApi.listManualAwards,
  });

  const [removeTarget, setRemoveTarget] = useState<{ userBadgeId: string; label: string } | null>(
    null,
  );

  const remove = useMutation({
    mutationFn: ({ userBadgeId, reason }: { userBadgeId: string; reason: string }) =>
      gamificationApi.removeUserBadge(userBadgeId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MANUAL_AWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-badge-stats"] });
      setRemoveTarget(null);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="mt-4 space-y-2">
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
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
        </div>
      ))}

      <TextPromptModal
        open={removeTarget !== null}
        title="Remove manual award"
        label={removeTarget ? `Reason for removing "${removeTarget.label}"` : ""}
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
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Manual award</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hand-award a badge to a specific user, with a mandatory reason for the audit trail.
        </p>
        <div className="mt-4">
          <AwardBadgeForm />
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Manual XP adjustment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Grant or dock XP for a specific user. Docking below zero is rejected.
        </p>
        <div className="mt-4">
          <AdjustXpForm />
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Manually awarded badges</h2>
        <ManualAwardsList />
      </div>
    </div>
  );
};
