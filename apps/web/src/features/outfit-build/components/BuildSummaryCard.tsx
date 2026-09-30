"use client";

import { Badge } from "@outfiqe/design-system";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { AppImage } from "@/shared/components/AppImage";

import type { OutfitSummary } from "../api/outfitSchemas";
import { formatNepalDateTime } from "../utils/outfitFormatting";

const PREVIEW_IMAGE_COUNT = 3;
const LEAD_PREVIEW_INDEX = 0;
const NO_ITEMS = 0;

export const buildPath = (outfitId: string) => `/builds/${outfitId}`;

export const BuildSummaryCard = ({ build }: { build: OutfitSummary }) => {
  const t = useTranslations("outfitBuild.myBuilds");
  const tBoard = useTranslations("outfitBuild.board");
  const locale = useLocale();
  const previewImages = build.previewImageUrls.slice(0, PREVIEW_IMAGE_COUNT);
  const extraItemCount = build.itemCount - previewImages.length;

  return (
    <Link
      href={buildPath(build.id)}
      className="block cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground focus-visible:border-foreground"
    >
      <div className="relative grid aspect-square grid-cols-2 grid-rows-2 gap-0.5 bg-muted">
        {previewImages.map((imageUrl, index) => (
          <span
            key={imageUrl}
            className={index === LEAD_PREVIEW_INDEX ? "relative row-span-2" : "relative"}
          >
            <AppImage src={imageUrl} alt="" fill sizes="(min-width: 640px) 25vw, 50vw" />
          </span>
        ))}
        {previewImages.length === NO_ITEMS && (
          <span className="col-span-2 row-span-2 flex items-center justify-center text-sm text-muted-foreground">
            {t("emptyBuild")}
          </span>
        )}
        {extraItemCount > NO_ITEMS && (
          <span className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground">
            {t("moreItems", { count: extraItemCount })}
          </span>
        )}
      </div>
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
