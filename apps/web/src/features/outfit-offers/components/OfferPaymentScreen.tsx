"use client";

import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useOfferPaymentCheck } from "../hooks/useOfferPaymentCheck";
import { useRetryOfferPayment } from "../hooks/useOffers";

type OfferPaymentScreenProps = {
  offerId: string;
  gatewayReportedFailure?: boolean;
};

const OFFERS_PATH = "/offers";

export const OfferPaymentScreen = ({
  offerId,
  gatewayReportedFailure = false,
}: OfferPaymentScreenProps) => {
  const t = useTranslations("outfitBuild.offer.payment");
  const paymentCheck = useOfferPaymentCheck(offerId);
  const retryPayment = useRetryOfferPayment();
  const { data } = paymentCheck;

  if (data?.isPaid) {
    return (
      <div className="space-y-3 text-center" role="status">
        <h1 className="font-display text-xl font-bold text-foreground">{t("paidTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("paidBody", { name: data.offer.creator.name })}
        </p>
        <Link
          href={`/builds/${data.offer.outfitId}`}
          className="inline-block text-sm font-medium text-foreground underline underline-offset-4"
        >
          {t("backToBuild")}
        </Link>
      </div>
    );
  }

  if (paymentCheck.isError || data?.isFailed || gatewayReportedFailure) {
    return (
      <div className="space-y-3 text-center" role="alert">
        <h1 className="font-display text-xl font-bold text-foreground">{t("failedTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("failedBody")}</p>
        {retryPayment.isError && <FormBanner>{getErrorMessage(retryPayment.error)}</FormBanner>}
        <div className="flex justify-center gap-2">
          <Button isLoading={retryPayment.isPending} onClick={() => retryPayment.mutate(offerId)}>
            {t("retry")}
          </Button>
          <Link
            href={OFFERS_PATH}
            className="inline-flex items-center text-sm font-medium text-foreground underline underline-offset-4"
          >
            {t("viewOffers")}
          </Link>
        </div>
      </div>
    );
  }

  if (paymentCheck.hasTimedOut) {
    return (
      <div className="space-y-3 text-center" role="status">
        <h1 className="font-display text-xl font-bold text-foreground">
          {t("stillCheckingTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("stillCheckingBody")}</p>
        <Link
          href={OFFERS_PATH}
          className="inline-block text-sm font-medium text-foreground underline underline-offset-4"
        >
          {t("viewOffers")}
        </Link>
      </div>
    );
  }

  return (
    <div aria-busy className="space-y-3 text-center" role="status">
      <p className="text-sm text-muted-foreground">{t("checking")}</p>
      <Skeleton className="mx-auto h-2 w-40 rounded-full" />
    </div>
  );
};
