"use client";

import { Skeleton } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { useAuth } from "@/features/auth";

import { useBuildOffers } from "../hooks/useOffers";
import { OfferCard } from "./OfferCard";
import { SendOfferPanel } from "./SendOfferPanel";

const NO_OFFERS = 0;

type BuildOffersSectionProps = {
  outfitId: string;
  isLocked: boolean;
  isMember: boolean;
  people: { id: string; name: string }[];
};

export const BuildOffersSection = ({
  outfitId,
  isLocked,
  isMember,
  people,
}: BuildOffersSectionProps) => {
  const t = useTranslations("outfitBuild.offer");
  const titleId = useId();
  const { isBrandOwner, isCreator, state } = useAuth();
  const canSeeOffers = isBrandOwner || isCreator;
  const { data: offers, isPending, isError } = useBuildOffers(outfitId, canSeeOffers);

  if (!canSeeOffers) return null;

  const otherPeople = people.filter(({ id }) => id !== state.user?.id);
  const hasOffers = (offers?.length ?? NO_OFFERS) > NO_OFFERS;

  return (
    <div className="space-y-3">
      {isBrandOwner && isMember && isLocked && (
        <SendOfferPanel outfitId={outfitId} people={otherPeople} />
      )}
      <section aria-labelledby={titleId} className="space-y-2">
        <h2 id={titleId} className="text-sm font-semibold text-foreground">
          {t("listTitle")}
        </h2>
        {isPending && <Skeleton className="h-24 w-full rounded-xl" />}
        {isError && <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>}
        {!isPending && !isError && !hasOffers && (
          <p className="text-sm text-muted-foreground">{t("emptyForBuild")}</p>
        )}
        {offers?.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </section>
    </div>
  );
};
