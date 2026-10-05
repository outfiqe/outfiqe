"use client";

import { cn, ProgressBar } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";

import { formatLakhAmount } from "../utils/outfitFormatting";

type BudgetBarProps = {
  total: number;
  budget: number | null;
  itemCount: number;
  isFullyAvailable: boolean;
};

export const BudgetBar = ({ total, budget, itemCount, isFullyAvailable }: BudgetBarProps) => {
  const t = useTranslations("outfitBuild.budget");
  const isOverBudget = budget !== null && total > budget;
  const totalText = t("rupees", { amount: formatLakhAmount(total) });

  return (
    <section aria-label={t("sectionLabel")} className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-lg font-bold text-foreground">
          {t("total", { total: totalText })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("itemCount", { count: itemCount })} ·{" "}
          {isFullyAvailable ? t("fullyAvailable") : t("someUnavailable")}
        </p>
      </div>

      {budget !== null && (
        <div className="mt-3 space-y-1.5">
          <ProgressBar
            value={Math.min(total, budget)}
            max={budget}
            label={t("progressLabel")}
            fillClassName={cn(isOverBudget && "bg-destructive")}
          />
          <p
            className={cn("text-xs", isOverBudget ? "text-destructive" : "text-muted-foreground")}
            role={isOverBudget ? "alert" : undefined}
          >
            {isOverBudget
              ? t("overBy", { amount: t("rupees", { amount: formatLakhAmount(total - budget) }) })
              : t("leftOf", {
                  left: t("rupees", { amount: formatLakhAmount(budget - total) }),
                  budget: t("rupees", { amount: formatLakhAmount(budget) }),
                })}
          </p>
        </div>
      )}
    </section>
  );
};
