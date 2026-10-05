"use client";

import { Button } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { OutfitBoard } from "../api/outfitSchemas";

type BoardActionsProps = {
  board: OutfitBoard;
  currentUserId: string | undefined;
  isSaving: boolean;
  onToggleHappy: (isHappy: boolean) => void;
  onLock: () => void;
  onUnlock: () => void;
  onArchive: () => void;
  onLeave: () => void;
  onOpenSettings: () => void;
  onOpenVisibility: () => void;
};

const lockBlocker = (
  board: OutfitBoard,
): "notEnoughItems" | "itemsSoldOut" | "notEveryoneHappy" | null => {
  if (board.itemCount < board.limits.minItemsToLock) return "notEnoughItems";
  if (!board.isFullyAvailable) return "itemsSoldOut";
  if (!board.isEveryoneHappy) return "notEveryoneHappy";
  return null;
};

export const BoardActions = ({
  board,
  currentUserId,
  isSaving,
  onToggleHappy,
  onLock,
  onUnlock,
  onArchive,
  onLeave,
  onOpenSettings,
  onOpenVisibility,
}: BoardActionsProps) => {
  const t = useTranslations("outfitBuild.actions");
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);
  const hasBeenLocked = board.lastLockedVersion !== null;
  const isOwner = board.myRole === "OWNER";
  const isDraft = board.status === "DRAFT";
  const isArchived = board.status === "ARCHIVED";
  const myMembership = board.members.find((member) => member.user.id === currentUserId);
  const blocker = lockBlocker(board);

  if (board.myRole === "VIEWER" || isArchived) return null;

  return (
    <section
      aria-label={t("sectionLabel")}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap gap-2">
        {isDraft && myMembership && (
          <Button
            variant={myMembership.isHappy ? "outline" : "default"}
            aria-pressed={myMembership.isHappy}
            disabled={isSaving}
            onClick={() => onToggleHappy(!myMembership.isHappy)}
          >
            {myMembership.isHappy ? t("notHappyAnyMore") : t("imHappy")}
          </Button>
        )}
        {isOwner && isDraft && (
          <Button onClick={onLock} disabled={isSaving || blocker !== null}>
            {t("lock")}
          </Button>
        )}
        {isOwner && !isDraft && (
          <Button variant="outline" onClick={onUnlock} disabled={isSaving}>
            {t("unlock")}
          </Button>
        )}
        {isOwner && (
          <>
            <Button variant="outline" onClick={onOpenVisibility} disabled={isSaving}>
              {t("whoCanSee")}
            </Button>
            <Button variant="ghost" onClick={onOpenSettings} disabled={isSaving}>
              {t("settings")}
            </Button>
          </>
        )}
        {!isOwner && !isConfirmingLeave && (
          <Button variant="ghost" onClick={() => setIsConfirmingLeave(true)} disabled={isSaving}>
            {t("leave")}
          </Button>
        )}
      </div>

      {!isOwner && isConfirmingLeave && (
        <div role="alert" className="space-y-2 rounded-lg border border-border p-3 text-sm">
          <p className="font-medium text-foreground">{t("leaveConfirm.title")}</p>
          <p className="text-muted-foreground">{t("leaveConfirm.body")}</p>
          {hasBeenLocked && <p className="text-muted-foreground">{t("leaveConfirm.creditNote")}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onLeave} disabled={isSaving}>
              {t("leaveConfirm.confirm")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsConfirmingLeave(false)}>
              {t("leaveConfirm.stay")}
            </Button>
          </div>
        </div>
      )}

      {isOwner && isDraft && blocker && (
        <p className="text-xs text-muted-foreground">
          {t(`lockBlockers.${blocker}`, { count: board.limits.minItemsToLock })}
        </p>
      )}

      {isOwner &&
        (isConfirmingArchive ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-foreground">{t("archiveConfirm")}</span>
            <Button
              size="sm"
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={onArchive}
              disabled={isSaving}
            >
              {t("archive")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsConfirmingArchive(false)}>
              {t("cancel")}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setIsConfirmingArchive(true)}>
            {t("archive")}
          </Button>
        ))}
    </section>
  );
};
