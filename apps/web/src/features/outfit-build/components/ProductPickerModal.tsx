"use client";

import { Button, FilterChip, Input, Modal, ScrollRow, Skeleton } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { PublicProduct } from "@/features/products/api/productSchemas";
import type { PublicProductType } from "@/features/products/api/productTypesApi";
import { AppImage } from "@/shared/components/AppImage";

import type { OutfitProduct, OutfitSlot } from "../api/outfitSchemas";
import {
  type ReplacementTarget,
  useReplacementSuggestions,
} from "../hooks/useReplacementSuggestions";
import { useSlotProductSearch } from "../hooks/useSlotProductSearch";
import { formatLakhAmount } from "../utils/outfitFormatting";

const SKELETON_ROW_COUNT = 4;
const SINGLE_TYPE = 1;
const NO_PRODUCTS = 0;

type Replacing = { product: OutfitProduct; target: ReplacementTarget };

type ProductPickerModalProps = {
  slot: OutfitSlot;
  productTypes: PublicProductType[];
  replacing: Replacing | null;
  onPick: (product: PublicProduct, productTypeId: string) => void;
  onPickReplacement: (product: OutfitProduct) => void;
  onClose: () => void;
};

const ReplacementSuggestions = ({
  target,
  onPick,
}: {
  target: ReplacementTarget;
  onPick: (product: OutfitProduct) => void;
}) => {
  const t = useTranslations("outfitBuild.picker");
  const tBudget = useTranslations("outfitBuild.budget");
  const { data: suggestions = [], isPending, isError } = useReplacementSuggestions(target);

  return (
    <section aria-labelledby="replacement-suggestions-title" className="space-y-2">
      <h3
        id="replacement-suggestions-title"
        className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
      >
        {t("suggestionsTitle")}
      </h3>
      <div aria-live="polite" aria-busy={isPending} className="space-y-2">
        {isPending && <Skeleton className="h-16 w-full rounded-lg" />}
        {isError && <p className="text-sm text-muted-foreground">{t("suggestionsLoadFailed")}</p>}
        {!isPending && !isError && suggestions.length === NO_PRODUCTS && (
          <p className="text-sm text-muted-foreground">{t("noSuggestions")}</p>
        )}
        {suggestions.map((suggestion) => (
          <ProductOption
            key={suggestion.id}
            name={suggestion.name}
            imageUrl={suggestion.imageUrl}
            details={`${tBudget("rupees", { amount: formatLakhAmount(suggestion.price) })} · ${suggestion.brand.name}`}
            onPick={() => onPick(suggestion)}
          />
        ))}
      </div>
    </section>
  );
};

export const ProductPickerModal = ({
  slot,
  productTypes,
  replacing,
  onPick,
  onPickReplacement,
  onClose,
}: ProductPickerModalProps) => {
  const t = useTranslations("outfitBuild.picker");
  const tBudget = useTranslations("outfitBuild.budget");
  const allowedTypes = slot.acceptsAnyProductType
    ? productTypes
    : productTypes.filter((productType) => slot.productTypeIds.includes(productType.id));
  const [firstAllowedType] = allowedTypes;
  const [typeSlug, setTypeSlug] = useState<string | null>(
    slot.acceptsAnyProductType ? null : (firstAllowedType?.slug ?? null),
  );
  const [searchText, setSearchText] = useState("");
  const typeIdBySlug = new Map(
    productTypes.map((productType) => [productType.slug, productType.id]),
  );

  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSlotProductSearch({ typeSlug, searchText, isEnabled: true });
  const products = data?.pages.flatMap((page) => page.products) ?? [];

  const pickProduct = (product: PublicProduct) => {
    const productTypeId = typeIdBySlug.get(product.type);
    if (productTypeId) onPick(product, productTypeId);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={
        replacing
          ? t("swapTitle", { product: replacing.product.name })
          : t("title", { slot: slot.label })
      }
    >
      <div className="space-y-3">
        {replacing && (
          <>
            <ReplacementSuggestions target={replacing.target} onPick={onPickReplacement} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("searchTitle")}
            </h3>
          </>
        )}
        <Input
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
        />

        {(allowedTypes.length > SINGLE_TYPE || slot.acceptsAnyProductType) && (
          <ScrollRow
            label={t("typeFilterLabel")}
            scrollBackLabel={t("earlierTypes")}
            scrollForwardLabel={t("moreTypes")}
            surface="card"
          >
            {slot.acceptsAnyProductType && (
              <FilterChip isSelected={typeSlug === null} onClick={() => setTypeSlug(null)}>
                {t("allTypes")}
              </FilterChip>
            )}
            {allowedTypes.map((productType) => (
              <FilterChip
                key={productType.id}
                isSelected={typeSlug === productType.slug}
                onClick={() => setTypeSlug(productType.slug)}
              >
                {productType.label}
              </FilterChip>
            ))}
          </ScrollRow>
        )}

        <div
          aria-live="polite"
          aria-busy={isPending}
          className="max-h-[55vh] space-y-2 overflow-y-auto"
        >
          {isPending &&
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          {isError && (
            <p role="alert" className="text-sm text-destructive">
              {t("loadFailed")}
            </p>
          )}
          {!isPending && !isError && products.length === NO_PRODUCTS && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("noResults")}</p>
          )}
          {products.map((product) => (
            <ProductOption
              key={product.id}
              name={product.name}
              imageUrl={product.imageUrl}
              details={`${tBudget("rupees", { amount: formatLakhAmount(product.effectivePrice) })} · ${product.brand}${product.lowStock ? ` · ${t("lowStock")}` : ""}`}
              onPick={() => pickProduct(product)}
            />
          ))}
          {hasNextPage && (
            <Button
              variant="outline"
              className="w-full"
              isLoading={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {t("loadMore")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

const ProductOption = ({
  name,
  imageUrl,
  details,
  onPick,
}: {
  name: string;
  imageUrl: string | null;
  details: string;
  onPick: () => void;
}) => (
  <button
    type="button"
    onClick={onPick}
    className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border p-2 text-left hover:border-foreground focus-visible:border-foreground"
  >
    <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
      {imageUrl && <AppImage src={imageUrl} alt="" fill sizes="56px" />}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium text-foreground">{name}</span>
      <span className="block truncate text-xs text-muted-foreground">{details}</span>
    </span>
  </button>
);
