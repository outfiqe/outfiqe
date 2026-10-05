"use client";

import { Button, Label, Select, Skeleton } from "@outfiqe/design-system";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { SavedSize } from "../api/savedSizesApi";
import { useChangeSavedSize, useSavedSizes } from "../hooks/useSavedSizes";

const NOT_SAVED_VALUE = "";
const SKELETON_ROW_COUNT = 4;
const NO_PRODUCT_TYPES = 0;

type SizeRowProps = {
  savedSize: SavedSize;
  isSaving: boolean;
  onChange: (sizeLabel: string | null) => void;
};

const SizeRow = ({ savedSize, isSaving, onChange }: SizeRowProps) => {
  const t = useTranslations("savedSizes");
  const { productTypeId, productTypeLabel, sizeOptions, lastBoughtSize } = savedSize;
  const selectId = `saved-size-${productTypeId}`;
  const canSuggestLastBought =
    savedSize.savedSize === null && lastBoughtSize !== null && sizeOptions.includes(lastBoughtSize);

  return (
    <li className="space-y-1.5 rounded-xl border border-border bg-card p-4">
      <Label htmlFor={selectId}>{t("sizeFor", { type: productTypeLabel })}</Label>
      <div className="flex items-center gap-2">
        <Select
          id={selectId}
          value={savedSize.savedSize ?? NOT_SAVED_VALUE}
          disabled={isSaving}
          onChange={(event) =>
            onChange(event.target.value === NOT_SAVED_VALUE ? null : event.target.value)
          }
        >
          <option value={NOT_SAVED_VALUE}>{t("notSet")}</option>
          {sizeOptions.map((sizeOption) => (
            <option key={sizeOption} value={sizeOption}>
              {sizeOption}
            </option>
          ))}
        </Select>
        {savedSize.savedSize !== null && (
          <Button
            variant="ghost"
            size="icon"
            disabled={isSaving}
            aria-label={t("clear", { type: productTypeLabel })}
            onClick={() => onChange(null)}
          >
            <X className="size-4" aria-hidden />
          </Button>
        )}
      </div>
      {canSuggestLastBought && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {t("lastBought", { size: lastBoughtSize })}
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => onChange(lastBoughtSize)}
          >
            {t("saveLastBought", { size: lastBoughtSize })}
          </Button>
        </p>
      )}
    </li>
  );
};

export const MySizesSettings = () => {
  const t = useTranslations("savedSizes");
  const { data: savedSizes, isPending, isError, refetch } = useSavedSizes();
  const changeSavedSize = useChangeSavedSize();

  if (isPending) {
    return (
      <div aria-busy="true" className="space-y-3">
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !savedSizes) {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-border p-4">
        <p className="text-sm text-destructive">{t("loadFailed")}</p>
        <Button variant="outline" onClick={() => void refetch()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (savedSizes.length === NO_PRODUCT_TYPES) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <ul className="space-y-3">
      {savedSizes.map((savedSize) => (
        <SizeRow
          key={savedSize.productTypeId}
          savedSize={savedSize}
          isSaving={
            changeSavedSize.isPending &&
            changeSavedSize.variables.productTypeId === savedSize.productTypeId
          }
          onChange={(sizeLabel) =>
            changeSavedSize.mutate({ productTypeId: savedSize.productTypeId, sizeLabel })
          }
        />
      ))}
    </ul>
  );
};
