"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";

import { useAuth } from "@/features/auth";

import type { Offer } from "../api/offerSchemas";
import { useReceivedOffers, useSentOffers } from "../hooks/useOffers";
import { OfferCard } from "./OfferCard";

const SKELETON_COUNT = 3;
const NO_OFFERS = 0;

type OfferListProps = {
  offers: Offer[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  emptyText: string;
};

const OfferList = ({
  offers,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  emptyText,
}: OfferListProps) => {
  const t = useTranslations("outfitBuild.offer");
  if (isLoading) {
    return (
      <div aria-busy className="space-y-3">
        {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError) return <p className="text-sm text-destructive">{t("loadFailed")}</p>;
  if (offers.length === NO_OFFERS) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} isBuildLinkShown />
      ))}
      {hasNextPage && (
        <Button variant="outline" onClick={onLoadMore} isLoading={isFetchingNextPage}>
          {t("loadMore")}
        </Button>
      )}
    </div>
  );
};

export const OffersPage = () => {
  const t = useTranslations("outfitBuild.offer");
  const { isAuthResolved, isBrandOwner } = useAuth();
  const received = useReceivedOffers(isAuthResolved && !isBrandOwner);
  const sent = useSentOffers(isAuthResolved && isBrandOwner);
  const shownOffers = isBrandOwner ? sent : received;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t("pageTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isBrandOwner ? t("pageDescriptionSent") : t("pageDescriptionReceived")}
        </p>
      </div>
      <OfferList
        offers={shownOffers.data?.pages.flatMap((page) => page.items) ?? []}
        isLoading={!isAuthResolved || shownOffers.isPending}
        isError={shownOffers.isError}
        hasNextPage={shownOffers.hasNextPage}
        isFetchingNextPage={shownOffers.isFetchingNextPage}
        onLoadMore={() => void shownOffers.fetchNextPage()}
        emptyText={isBrandOwner ? t("emptySent") : t("emptyReceived")}
      />
    </div>
  );
};
