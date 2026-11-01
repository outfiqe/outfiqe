"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  FEED_LAYOUT,
  type FeedLayout,
  LIST_FEED_COLUMN_CLASS_NAME,
} from "@/features/explore/constants/explore.constants";
import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";
import { cn } from "@/shared/lib/cn";
import { replaceUrlSearchParams } from "@/shared/lib/replaceUrlSearchParams";

import type { PublicBuildCard, PublicBuildFilters } from "../../social/api/outfitSocialSchemas";
import { usePublicBuilds } from "../../social/hooks/useBuildSocial";
import {
  clearNarrowingFilters,
  hasNarrowingFilters,
  readPublicBuildFilters,
  writePublicBuildFilters,
} from "../utils/publicBuildFilters";
import { BuildDetailModal } from "./BuildDetailModal";
import { PublicBuildCardView } from "./PublicBuildCardView";
import { PublicBuildFiltersBar } from "./PublicBuildFiltersBar";

const FILTER_DEBOUNCE_MS = 300;
const SKELETON_CARD_COUNT = 6;
const NO_BUILDS = 0;
const GRID_CARDS_CLASS_NAME = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";
const LIST_CARDS_CLASS_NAME = cn(LIST_FEED_COLUMN_CLASS_NAME, "gap-4");
const LIST_COVER_IMAGE_SIZES = "(min-width: 640px) 36rem, 100vw";

type PublicBuildsFeedProps = {
  fixedFilters?: Pick<PublicBuildFilters, "contributorId" | "brandId">;
  showFilters?: boolean;
  layout?: FeedLayout;
};

export const PublicBuildsFeed = ({
  fixedFilters,
  showFilters = true,
  layout = FEED_LAYOUT.GRID,
}: PublicBuildsFeedProps) => {
  const t = useTranslations("outfitBuild.public");
  const tBoard = useTranslations("outfitBuild.board");
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<PublicBuildFilters>(() =>
    showFilters ? readPublicBuildFilters(searchParams) : {},
  );
  const changeFilters = (nextFilters: PublicBuildFilters) => {
    setFilters(nextFilters);
    replaceUrlSearchParams((params) => writePublicBuildFilters(params, nextFilters));
  };
  const debouncedFilters = useDebouncedValue(filters, FILTER_DEBOUNCE_MS);
  const [openBuildCard, setOpenBuildCard] = useState<PublicBuildCard | null>(null);
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    usePublicBuilds({ ...debouncedFilters, ...fixedFilters });
  const builds = data?.pages.flatMap((page) => page.items) ?? [];
  const isNarrowed = hasNarrowingFilters(debouncedFilters);
  const isListLayout = layout === FEED_LAYOUT.LIST;
  const cardsClassName = isListLayout ? LIST_CARDS_CLASS_NAME : GRID_CARDS_CLASS_NAME;
  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  return (
    <section aria-label={t("feedLabel")} className="space-y-4">
      {showFilters && <PublicBuildFiltersBar filters={filters} onChange={changeFilters} />}

      <div aria-live="polite" aria-busy={isPending}>
        {isPending && (
          <div className={cardsClassName}>
            {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
              <Skeleton key={index} className="aspect-[4/5] w-full rounded-xl" />
            ))}
          </div>
        )}
        {isError && (
          <div role="alert" className="space-y-2 rounded-xl border border-border p-4">
            <p className="text-sm text-destructive">{t("feedFailed")}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {t("retry")}
            </Button>
          </div>
        )}
        {!isPending && !isError && builds.length === NO_BUILDS && (
          <div className="space-y-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {isNarrowed ? t("emptyFilteredFeed") : t("emptyFeed")}
            </p>
            {isNarrowed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeFilters(clearNarrowingFilters(filters))}
              >
                {t("clearFilters")}
              </Button>
            )}
          </div>
        )}
        <div className={cardsClassName}>
          {builds.map((card) => (
            <PublicBuildCardView
              key={card.id}
              card={card}
              coverImageSizes={isListLayout ? LIST_COVER_IMAGE_SIZES : undefined}
              onOpen={setOpenBuildCard}
            />
          ))}
        </div>
        <div ref={sentinelRef} />
        {isFetchingNextPage && <Skeleton className="mt-4 h-24 w-full rounded-xl" />}
      </div>

      {openBuildCard && (
        <BuildDetailModal
          outfitId={openBuildCard.id}
          title={openBuildCard.title ?? tBoard("untitled")}
          onClose={() => setOpenBuildCard(null)}
        />
      )}
    </section>
  );
};
