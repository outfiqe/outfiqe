"use client";

import { Badge } from "@outfiqe/design-system";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { OutfitBoard } from "../../api/outfitSchemas";

export const BoardHeader = ({ board }: { board: OutfitBoard }) => {
  const t = useTranslations("outfitBuild.board");

  return (
    <header className="flex flex-wrap items-center gap-3">
      <h1 className="font-display text-2xl font-bold text-foreground">
        {board.title ?? t("untitled")}
      </h1>
      <Badge tone={board.status === "LOCKED" ? "positive" : "neutral"} showDot={false}>
        {t(`status.${board.status}`)}
      </Badge>
      <Badge tone="neutral" showDot={false}>
        {t(`visibility.${board.visibility}`)}
      </Badge>
      {board.conversationId && (
        <Link
          href={`/messages/${board.conversationId}`}
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          <MessageCircle className="size-4" aria-hidden />
          {t("openChat")}
        </Link>
      )}
    </header>
  );
};
