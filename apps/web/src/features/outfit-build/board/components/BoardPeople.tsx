"use client";

import { Button } from "@outfiqe/design-system";
import { Check, Crown } from "lucide-react";
import { useTranslations } from "next-intl";

import type { OutfitBoard } from "../../api/outfitSchemas";
import { PersonAvatar } from "../../components/PersonAvatar";

type BoardPeopleProps = {
  board: OutfitBoard;
  currentUserId: string | undefined;
  onInvite: () => void;
  onRemoveEditor: (userId: string) => void;
  onHandOver: (userId: string) => void;
};

export const BoardPeople = ({
  board,
  currentUserId,
  onInvite,
  onRemoveEditor,
  onHandOver,
}: BoardPeopleProps) => {
  const t = useTranslations("outfitBuild.people");
  const isOwner = board.myRole === "OWNER";
  const canManagePeople = isOwner && board.status !== "ARCHIVED";
  const canInvite = canManagePeople && board.status === "DRAFT";

  return (
    <section
      aria-labelledby="board-people-title"
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="board-people-title" className="text-sm font-bold text-foreground">
          {t("title")}
        </h2>
        {canInvite && (
          <Button size="sm" variant="outline" onClick={onInvite}>
            {t("invite")}
          </Button>
        )}
      </div>
      <ul className="space-y-2">
        {board.members.map(({ user, role, isHappy }) => (
          <li key={user.id} className="flex items-center gap-2">
            <PersonAvatar person={user} className="size-8" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 truncate text-sm text-foreground">
                {user.id === currentUserId ? t("you", { name: user.name }) : user.name}
                {role === "OWNER" && (
                  <Crown className="size-3.5 text-amber-500" aria-label={t("owner")} />
                )}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {isHappy ? (
                  <>
                    <Check className="size-3.5 text-emerald-600" aria-hidden />
                    {t("happy")}
                  </>
                ) : (
                  t("waiting")
                )}
              </span>
            </span>
            {canManagePeople && role === "EDITOR" && (
              <span className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => onHandOver(user.id)}>
                  {t("makeOwner")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onRemoveEditor(user.id)}>
                  {t("remove")}
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
