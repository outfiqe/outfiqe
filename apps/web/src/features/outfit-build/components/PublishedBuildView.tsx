"use client";

import { useLocale, useTranslations } from "next-intl";

import { AppImage } from "@/shared/components/AppImage";

import type { OutfitPublished } from "../api/outfitSchemas";
import { formatLakhAmount, formatNepalDateTime } from "../utils/outfitFormatting";
import { PersonAvatar } from "./PersonAvatar";

const NO_CONTRIBUTORS = 0;

export const PublishedBuildView = ({ build }: { build: OutfitPublished }) => {
  const t = useTranslations("outfitBuild.published");
  const tBudget = useTranslations("outfitBuild.budget");
  const tBoard = useTranslations("outfitBuild.board");
  const locale = useLocale();
  const hasContributors = build.contributors.length > NO_CONTRIBUTORS;

  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {build.title ?? tBoard("untitled")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("lockedOn", { date: formatNepalDateTime(build.lockedAt, locale) })}
        </p>
      </header>

      {hasContributors && (
        <section aria-labelledby="build-contributors-title">
          <h2 id="build-contributors-title" className="sr-only">
            {t("contributors")}
          </h2>
          <ul className="flex flex-wrap gap-3">
            {build.contributors.map((contributor) => (
              <li key={contributor.id} className="flex items-center gap-2 text-sm text-foreground">
                <PersonAvatar person={contributor} className="size-7" />
                {contributor.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {build.items.map((item) => (
          <li
            key={`${item.slotKey}-${item.position}`}
            className="flex gap-3 rounded-xl border border-border bg-card p-3"
          >
            <span className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
              {item.imageUrl && (
                <AppImage src={item.imageUrl} alt={item.productName} fill sizes="80px" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {item.slotLabel}
              </span>
              <span className="block truncate text-sm font-medium text-foreground">
                {item.productName}
              </span>
              <span className="block text-xs text-muted-foreground">
                {tBudget("rupees", { amount: formatLakhAmount(item.unitPrice) })} · {item.brandName}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="font-display text-lg font-bold text-foreground">
        {tBudget("total", { total: tBudget("rupees", { amount: formatLakhAmount(build.total) }) })}
      </p>
      <p className="text-xs text-muted-foreground">{t("pricesAtLock")}</p>
    </article>
  );
};
