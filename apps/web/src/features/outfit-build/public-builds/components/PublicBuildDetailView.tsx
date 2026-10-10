"use client";

import { Button } from "@outfiqe/design-system";
import { Flag } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { useAuth } from "@/features/auth";
import { ReportContentModal } from "@/features/explore/posts/components/ReportContentModal";
import { useReportContent } from "@/features/explore/posts/hooks/useReportContent";
import { AppImage } from "@/shared/components/AppImage";

import { BuyBuildPanel } from "../../components/BuyBuildPanel";
import { PersonAvatar } from "../../components/PersonAvatar";
import type { PublicBuildDetail } from "../../social/api/outfitSocialSchemas";
import { BuildComments } from "../../social/components/BuildComments";
import { BuildReactionsBar } from "../../social/components/BuildReactionsBar";
import { formatLakhAmount, formatNepalDateTime } from "../../utils/outfitFormatting";
import { PublicBuildPhotos } from "./PublicBuildPhotos";

const NO_CONTRIBUTORS = 0;

type PublicBuildDetailViewProps = {
  build: PublicBuildDetail;
  headingLevel?: "h1" | "h2";
};

export const PublicBuildDetailView = ({
  build,
  headingLevel = "h1",
}: PublicBuildDetailViewProps) => {
  const t = useTranslations("outfitBuild.public");
  const tPublished = useTranslations("outfitBuild.published");
  const tBudget = useTranslations("outfitBuild.budget");
  const tBoard = useTranslations("outfitBuild.board");
  const locale = useLocale();
  const { isAuthenticated } = useAuth();
  const [isReporting, setIsReporting] = useState(false);
  const reportBuild = useReportContent(() => setIsReporting(false));
  const Heading = headingLevel;
  const hasContributors = build.contributors.length > NO_CONTRIBUTORS;

  return (
    <article className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading className="font-display text-2xl font-bold text-foreground">
            {build.title ?? tBoard("untitled")}
          </Heading>
          <p className="mt-1 text-sm text-muted-foreground">
            {tPublished("lockedOn", { date: formatNepalDateTime(build.lockedAt, locale) })}
          </p>
        </div>
        {isAuthenticated && (
          <Button variant="ghost" size="sm" onClick={() => setIsReporting(true)}>
            <Flag className="size-4" aria-hidden />
            {t("reportBuild")}
          </Button>
        )}
      </header>

      {hasContributors && (
        <section aria-label={tPublished("contributors")}>
          <ul className="flex flex-wrap gap-3">
            {build.contributors.map((contributor) => (
              <li key={contributor.id}>
                <Link
                  href={`/creator/${contributor.handle}`}
                  className="flex items-center gap-2 text-sm text-foreground hover:underline"
                >
                  <PersonAvatar person={contributor} className="size-7" />
                  {contributor.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BuildReactionsBar build={build} />

      <PublicBuildPhotos photos={build.photos} canReport={isAuthenticated} />

      <ul className="grid gap-3 sm:grid-cols-2">
        {build.items.map((buildItem) => (
          <li
            key={`${buildItem.slotKey}-${buildItem.position}`}
            className="flex gap-3 rounded-xl border border-border bg-card p-3"
          >
            <Link
              href={`/product/${buildItem.productId}`}
              className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted"
            >
              {buildItem.imageUrl && (
                <AppImage src={buildItem.imageUrl} alt={buildItem.productName} fill sizes="80px" />
              )}
            </Link>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {buildItem.slotLabel}
              </span>
              <Link
                href={`/product/${buildItem.productId}`}
                className="block truncate text-sm font-medium text-foreground hover:underline"
              >
                {buildItem.productName}
              </Link>
              <span className="block text-xs text-muted-foreground">
                {tBudget("rupees", { amount: formatLakhAmount(buildItem.unitPrice) })} ·{" "}
                {buildItem.brandName}
              </span>
              <span
                className={
                  buildItem.isInStock
                    ? "block text-xs text-muted-foreground"
                    : "block text-xs text-destructive"
                }
              >
                {buildItem.isInStock ? t("inStock") : t("soldOut")}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-sm font-semibold text-foreground">
        {tBudget("total", { total: tBudget("rupees", { amount: formatLakhAmount(build.total) }) })}
      </p>
      <p className="text-xs text-muted-foreground">{tPublished("pricesAtLock")}</p>

      <BuyBuildPanel
        outfitId={build.id}
        items={build.items.map(({ productId, productName, sizes }) => ({
          productId,
          productName,
          sizes,
        }))}
      />

      <BuildComments outfitId={build.id} canComment={build.canComment} />

      {isReporting && (
        <ReportContentModal
          targetLabel="build"
          isPending={reportBuild.isPending}
          onCancel={() => setIsReporting(false)}
          onConfirm={({ reason, note }) =>
            reportBuild.mutate({ targetType: "OUTFIT_BUILD", targetId: build.id, reason, note })
          }
        />
      )}
    </article>
  );
};
