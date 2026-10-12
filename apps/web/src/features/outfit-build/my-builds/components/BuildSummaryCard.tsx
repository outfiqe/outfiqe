"use client";

import { Badge } from "@outfiqe/design-system";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import type { OutfitSummary } from "../../api/outfitSchemas";
import { BuildCoverGrid } from "../../components/BuildCoverGrid";
import { formatNepalDateTime } from "../../utils/outfitFormatting";

export const buildPath = (outfitId: string) => `/builds/${outfitId}`;

export const BuildSummaryCard = ({ build }: { build: OutfitSummary }) => {
  const t = useTranslations("outfitBuild.myBuilds");
  const tBoard = useTranslations("outfitBuild.board");
  const locale = useLocale();

  return (
    <Link
      href={buildPath(build.id)}
      className="block cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground focus-visible:border-foreground"
    >
      <BuildCoverGrid
        coverPhotos={build.coverPhotos}
        previewImageUrls={build.previewImageUrls}
        itemCount={build.itemCount}
        emptyLabel={t("emptyBuild")}
        sizes="(min-width: 640px) 25vw, 50vw"
        className="aspect-square"
      />
      <div className="space-y-1 p-3">
        <p className="truncate font-medium text-foreground">{build.title ?? tBoard("untitled")}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge tone={build.status === "LOCKED" ? "positive" : "neutral"} showDot={false}>
            {tBoard(`status.${build.status}`)}
          </Badge>
          <span>{t("people", { count: build.memberCount })}</span>
          <span>{formatNepalDateTime(build.updatedAt, locale)}</span>
        </div>
      </div>
    </Link>
  );
};
