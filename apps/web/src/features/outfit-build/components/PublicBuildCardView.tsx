"use client";

import { CheriqIcon } from "@outfiqe/design-system";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PublicBuildCard } from "../api/outfitSocialSchemas";
import { formatLakhAmount } from "../utils/outfitFormatting";
import { BuildCoverGrid } from "./BuildCoverGrid";

const NO_CONTRIBUTORS = 0;

export const contributorNames = (card: PublicBuildCard): string =>
  card.contributors.map(({ name }) => name).join(", ");

export const PublicBuildCardView = ({
  card,
  onOpen,
}: {
  card: PublicBuildCard;
  onOpen: (outfitId: string) => void;
}) => {
  const t = useTranslations("outfitBuild.public");
  const tBudget = useTranslations("outfitBuild.budget");
  const tBoard = useTranslations("outfitBuild.board");
  const title = card.title ?? tBoard("untitled");
  const hasContributors = card.contributors.length > NO_CONTRIBUTORS;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => onOpen(card.id)}
        aria-label={t("openBuild", { title })}
        className="block w-full cursor-pointer text-left"
      >
        <BuildCoverGrid
          coverPhotos={card.coverPhotos}
          previewImageUrls={card.previewImageUrls}
          itemCount={card.itemCount}
          emptyLabel={t("noPreview")}
          sizes="(min-width: 1024px) 160px, 50vw"
          className="aspect-[4/3]"
        />
        <div className="space-y-1 p-3">
          <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
          {hasContributors && (
            <p className="truncate text-xs text-muted-foreground">
              {t("by", { names: contributorNames(card) })}
            </p>
          )}
          <p className="text-xs text-foreground">
            {tBudget("rupees", { amount: formatLakhAmount(card.total) })} ·{" "}
            {t("itemCount", { count: card.itemCount })}
          </p>
          <p
            className={
              card.isFullyAvailable ? "text-xs text-muted-foreground" : "text-xs text-destructive"
            }
          >
            {card.isFullyAvailable ? tBudget("fullyAvailable") : tBudget("someUnavailable")}
          </p>
          <p className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CheriqIcon className="size-3.5" isCheriqed={card.isLiked} />
              <span className="sr-only">{t("likes")}</span>
              {card.likeCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="size-3.5" aria-hidden />
              <span className="sr-only">{t("comments")}</span>
              {card.commentCount}
            </span>
          </p>
        </div>
      </button>
    </article>
  );
};
