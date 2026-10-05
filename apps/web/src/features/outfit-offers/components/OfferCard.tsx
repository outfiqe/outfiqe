"use client";

import { Badge, Button, FormBanner } from "@outfiqe/design-system";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import {
  formatLakhAmount,
  formatNepalDateTime,
} from "@/features/outfit-build/utils/outfitFormatting";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import {
  type Offer,
  OFFER_REFUND_STATUS,
  OFFER_STATUS,
  OFFER_VIEWER_SIDE,
} from "../api/offerSchemas";
import { useRespondToOffer, useRetryOfferPayment } from "../hooks/useOffers";

type BadgeTone = "neutral" | "positive" | "negative";

const STATUS_TONE: Record<Offer["status"], BadgeTone> = {
  PAYMENT_PENDING: "neutral",
  PAYMENT_FAILED: "negative",
  AWAITING_RESPONSE: "neutral",
  ACCEPTED: "positive",
  POSTED: "positive",
  RELEASED: "positive",
  DECLINED: "negative",
  CANCELLED: "negative",
  EXPIRED: "negative",
  LOOK_REMOVED: "negative",
};

const OfferDeadline = ({ offer }: { offer: Offer }) => {
  const t = useTranslations("outfitBuild.offer");
  const locale = useLocale();
  const { status, acceptBy, postBy, releaseAt } = offer;
  const formatDate = (date: string) => formatNepalDateTime(date, locale);

  if (status === OFFER_STATUS.AWAITING_RESPONSE && acceptBy) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("answerBy", { date: formatDate(acceptBy) })}
      </p>
    );
  }
  if (status === OFFER_STATUS.ACCEPTED && postBy) {
    return (
      <p className="text-xs text-muted-foreground">{t("postBy", { date: formatDate(postBy) })}</p>
    );
  }
  if (status === OFFER_STATUS.POSTED && releaseAt) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("releaseAt", { date: formatDate(releaseAt) })}
      </p>
    );
  }
  return null;
};

const RefundLine = ({ offer }: { offer: Offer }) => {
  const t = useTranslations("outfitBuild.offer");
  if (offer.viewerSide !== OFFER_VIEWER_SIDE.BRAND) return null;
  switch (offer.refundStatus) {
    case OFFER_REFUND_STATUS.PENDING:
      return <p className="text-xs text-muted-foreground">{t("refundPending")}</p>;
    case OFFER_REFUND_STATUS.REFUNDED:
      return <p className="text-xs text-muted-foreground">{t("refunded")}</p>;
    case OFFER_REFUND_STATUS.NEEDS_MANUAL_REFUND:
      return <p className="text-xs text-muted-foreground">{t("manualRefund")}</p>;
    default:
      return null;
  }
};

type OfferCardProps = {
  offer: Offer;
  isBuildLinkShown?: boolean;
};

export const OfferCard = ({ offer, isBuildLinkShown = false }: OfferCardProps) => {
  const t = useTranslations("outfitBuild.offer");
  const tBoard = useTranslations("outfitBuild.board");
  const tBudget = useTranslations("outfitBuild.budget");
  const respond = useRespondToOffer();
  const retryPayment = useRetryOfferPayment();
  const { id, viewerSide, status, brand, creator, amount, note, outfitId, outfitTitle } = offer;
  const isCreatorSide = viewerSide === OFFER_VIEWER_SIDE.CREATOR;
  const isBrandSide = viewerSide === OFFER_VIEWER_SIDE.BRAND;
  const isActing = respond.isPending || retryPayment.isPending;
  const actionError = respond.error ?? retryPayment.error;

  return (
    <article className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isCreatorSide
              ? t("fromBrand", { brand: brand.name })
              : t("toCreator", { name: creator.name })}
          </p>
          <p className="font-display text-lg font-bold text-foreground">
            {tBudget("rupees", { amount: formatLakhAmount(amount) })}
          </p>
        </div>
        <Badge tone={STATUS_TONE[status]} showDot={false}>
          {t(`status.${status}`)}
        </Badge>
      </div>

      {isBuildLinkShown && (
        <Link
          href={`/builds/${outfitId}`}
          className="block text-sm text-foreground underline underline-offset-4"
        >
          {outfitTitle ?? tBoard("untitled")}
        </Link>
      )}
      {note && <p className="text-sm text-muted-foreground">“{note}”</p>}
      <OfferDeadline offer={offer} />
      <RefundLine offer={offer} />
      {actionError && <FormBanner>{getErrorMessage(actionError)}</FormBanner>}

      <div className="flex flex-wrap gap-2">
        {isCreatorSide && status === OFFER_STATUS.AWAITING_RESPONSE && (
          <>
            <Button
              size="sm"
              disabled={isActing}
              isLoading={respond.isPending && respond.variables?.action === "accept"}
              onClick={() => respond.mutate({ offerId: id, action: "accept" })}
            >
              {t("accept")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isActing}
              onClick={() => respond.mutate({ offerId: id, action: "decline" })}
            >
              {t("decline")}
            </Button>
          </>
        )}
        {isBrandSide && status === OFFER_STATUS.AWAITING_RESPONSE && (
          <Button
            size="sm"
            variant="outline"
            disabled={isActing}
            onClick={() => respond.mutate({ offerId: id, action: "cancel" })}
          >
            {t("cancel")}
          </Button>
        )}
        {isBrandSide && status === OFFER_STATUS.PAYMENT_PENDING && (
          <Button
            size="sm"
            disabled={isActing}
            isLoading={retryPayment.isPending}
            onClick={() => retryPayment.mutate(id)}
          >
            {t("finishPayment")}
          </Button>
        )}
      </div>
    </article>
  );
};
