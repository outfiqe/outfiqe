"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

import type { PublicBuildFilters } from "../api/outfitSocialSchemas";
import { usePublicBuilds } from "../hooks/useBuildSocial";
import { clearNarrowingFilters, hasNarrowingFilters } from "../utils/publicBuildFilters";
import { BuildDetailModal } from "./BuildDetailModal";
import { PublicBuildCardView } from "./PublicBuildCardView";
import { PublicBuildFiltersBar } from "./PublicBuildFiltersBar";

const FILTER_DEBOUNCE_MS = 300;
const SKELETON_CARD_COUNT = 6;
const NO_BUILDS = 0;

type PublicBuildsFeedProps = {
  fixedFilters?: Pick<PublicBuildFilters, "contributorId" | "brandId">;
  showFilters?: boolean;
};

export const PublicBuildsFeed = ({ fixedFilters, showFilters = true }: PublicBuildsFeedProps) => {
  const t = useTranslations("outfitBuild.public");
  const [filters, setFilters] = useState<PublicBuildFilters>({});
  const debouncedFilters = useDebouncedValue(filters, FILTER_DEBOUNCE_MS);
  const [openOutfitId, setOpenOutfitId] = useState<string | null>(null);
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    usePublicBuilds({ ...debouncedFilters, ...fixedFilters });
  const builds = data?.pages.flatMap((page) => page.items) ?? [];
  const isNarrowed = hasNarrowingFilters(debouncedFilters);
  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  return (
    <section aria-label={t("feedLabel")} className="space-y-4">
      {showFilters && <PublicBuildFiltersBar filters={filters} onChange={setFilters} />}

      <div aria-live="polite" aria-busy={isPending}>
        {isPending && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                onClick={() => setFilters(clearNarrowingFilters(filters))}
              >
                {t("clearFilters")}
              </Button>
            )}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {builds.map((card) => (
            <PublicBuildCardView key={card.id} card={card} onOpen={setOpenOutfitId} />
          ))}
        </div>
        <div ref={sentinelRef} />
        {isFetchingNextPage && <Skeleton className="mt-4 h-24 w-full rounded-xl" />}
      </div>

      {openOutfitId && (
        <BuildDetailModal outfitId={openOutfitId} onClose={() => setOpenOutfitId(null)} />
      )}
    </section>
  );
};
