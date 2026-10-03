"use client";

import { Button } from "@outfiqe/design-system";
import { Flag } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { useAuth } from "@/features/auth";
import { ReportContentModal } from "@/features/explore/components/ReportContentModal";
import { useReportContent } from "@/features/explore/hooks/useReportContent";
import { AppImage } from "@/shared/components/AppImage";

import type { PublicBuildDetail } from "../api/outfitSocialSchemas";
import { formatLakhAmount, formatNepalDateTime } from "../utils/outfitFormatting";
import { BuildComments } from "./BuildComments";
import { BuildReactionsBar } from "./BuildReactionsBar";
import { BuyBuildPanel } from "./BuyBuildPanel";
import { PersonAvatar } from "./PersonAvatar";

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

      <BuildReactionsBar build={build} />

      <ul className="grid gap-3 sm:grid-cols-2">
        {build.items.map((item) => (
          <li
            key={`${item.slotKey}-${item.position}`}
            className="flex gap-3 rounded-xl border border-border bg-card p-3"
          >
            <Link
              href={`/product/${item.productId}`}
              className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted"
            >
              {item.imageUrl && (
                <AppImage src={item.imageUrl} alt={item.productName} fill sizes="80px" />
              )}
            </Link>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {item.slotLabel}
              </span>
              <Link
                href={`/product/${item.productId}`}
                className="block truncate text-sm font-medium text-foreground hover:underline"
              >
                {item.productName}
              </Link>
              <span className="block text-xs text-muted-foreground">
                {tBudget("rupees", { amount: formatLakhAmount(item.unitPrice) })} · {item.brandName}
              </span>
              <span
                className={
                  item.isInStock
                    ? "block text-xs text-muted-foreground"
                    : "block text-xs text-destructive"
                }
              >
                {item.isInStock ? t("inStock") : t("soldOut")}
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
