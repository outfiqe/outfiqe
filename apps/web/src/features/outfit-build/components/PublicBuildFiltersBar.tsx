"use client";

import { Checkbox, Input, Label, Select } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { useCategories } from "@/features/categories/hooks/useCategories";

import type { PublicBuildFilters } from "../api/outfitSocialSchemas";

const ALL_CATEGORIES_VALUE = "";
const DECIMAL_RADIX = 10;
const PRICE_STEP = 500;
const MIN_PRICE = 0;

const toPrice = (text: string): number | undefined => {
  const parsed = Number.parseInt(text, DECIMAL_RADIX);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const PublicBuildFiltersBar = ({
  filters,
  onChange,
}: {
  filters: PublicBuildFilters;
  onChange: (filters: PublicBuildFilters) => void;
}) => {
  const t = useTranslations("outfitBuild.public");
  const fieldId = useId();
  const { data: categories = [] } = useCategories();

  return (
    <fieldset className="grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-4 sm:items-end">
      <legend className="sr-only">{t("filtersLabel")}</legend>
      <div className="space-y-1">
        <Label htmlFor={`${fieldId}-category`}>{t("category")}</Label>
        <Select
          id={`${fieldId}-category`}
          value={filters.category ?? ALL_CATEGORIES_VALUE}
          onChange={(event) =>
            onChange({
              ...filters,
              category:
                event.target.value === ALL_CATEGORIES_VALUE ? undefined : event.target.value,
            })
          }
        >
          <option value={ALL_CATEGORIES_VALUE}>{t("allCategories")}</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${fieldId}-min`}>{t("minPrice")}</Label>
        <Input
          id={`${fieldId}-min`}
          type="number"
          inputMode="numeric"
          min={MIN_PRICE}
          step={PRICE_STEP}
          value={filters.minPrice ?? ""}
          onChange={(event) => onChange({ ...filters, minPrice: toPrice(event.target.value) })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${fieldId}-max`}>{t("maxPrice")}</Label>
        <Input
          id={`${fieldId}-max`}
          type="number"
          inputMode="numeric"
          min={MIN_PRICE}
          step={PRICE_STEP}
          value={filters.maxPrice ?? ""}
          onChange={(event) => onChange({ ...filters, maxPrice: toPrice(event.target.value) })}
        />
      </div>
      <div className="flex items-center gap-2 pb-2">
        <Checkbox
          id={`${fieldId}-stock`}
          checked={filters.isInStockOnly ?? false}
          onChange={(event) => onChange({ ...filters, isInStockOnly: event.target.checked })}
        />
        <Label htmlFor={`${fieldId}-stock`}>{t("inStockOnly")}</Label>
      </div>
    </fieldset>
  );
};
