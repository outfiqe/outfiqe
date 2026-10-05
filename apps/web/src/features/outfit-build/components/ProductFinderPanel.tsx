"use client";

import { useDraggable } from "@dnd-kit/core";
import { Button, cn, Input, Select, Skeleton } from "@outfiqe/design-system";
import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { PublicProduct } from "@/features/products/api/productSchemas";
import type { PublicProductType } from "@/features/products/api/productTypesApi";
import { AppImage } from "@/shared/components/AppImage";

import { useSlotProductSearch } from "../hooks/useSlotProductSearch";
import { formatLakhAmount } from "../utils/outfitFormatting";

const SKELETON_CARD_COUNT = 3;
const NO_RESULTS = 0;
const ALL_TYPES_VALUE = "";

export const productDragId = (productId: string) => `product:${productId}`;

type ProductFinderPanelProps = {
  productTypes: PublicProductType[];
};

export const ProductFinderPanel = ({ productTypes }: ProductFinderPanelProps) => {
  const t = useTranslations("outfitBuild.picker");
  const [typeSlug, setTypeSlug] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSlotProductSearch({ typeSlug, searchText, isEnabled: true });
  const products = data?.pages.flatMap((page) => page.products) ?? [];

  return (
    <section
      aria-labelledby="product-finder-title"
      className="rounded-xl border border-border bg-card p-4"
    >
      <h2 id="product-finder-title" className="text-sm font-bold text-foreground">
        {t("finderTitle")}
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">{t("finderHint")}</p>
      <Input
        type="search"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
      />
      <Select
        aria-label={t("typeFilterLabel")}
        value={typeSlug ?? ALL_TYPES_VALUE}
        onChange={(event) => setTypeSlug(event.target.value || null)}
        className="mt-2"
      >
        <option value={ALL_TYPES_VALUE}>{t("allTypes")}</option>
        {productTypes.map((productType) => (
          <option key={productType.id} value={productType.slug}>
            {productType.label}
          </option>
        ))}
      </Select>

      <ul aria-busy={isLoading} className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto">
        {isLoading &&
          Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
            <li key={index}>
              <Skeleton className="h-16 w-full rounded-lg" />
            </li>
          ))}
        {isError && (
          <li role="alert" className="text-sm text-destructive">
            {t("loadFailed")}
          </li>
        )}
        {!isLoading && !isError && products.length === NO_RESULTS && (
          <li className="py-4 text-center text-sm text-muted-foreground">{t("noResults")}</li>
        )}
        {products.map((product) => (
          <DraggableProductCard key={product.id} product={product} />
        ))}
      </ul>
      {hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          isLoading={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {t("loadMore")}
        </Button>
      )}
    </section>
  );
};

const DraggableProductCard = ({ product }: { product: PublicProduct }) => {
  const t = useTranslations("outfitBuild.picker");
  const tBudget = useTranslations("outfitBuild.budget");
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: productDragId(product.id),
    data: { product },
  });

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={t("dragLabel", { product: product.name })}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-lg border border-border bg-background p-2 active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
        {product.imageUrl && <AppImage src={product.imageUrl} alt="" fill sizes="48px" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm text-foreground">{product.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {tBudget("rupees", { amount: formatLakhAmount(product.effectivePrice) })} ·{" "}
          {product.brand}
        </span>
      </span>
    </li>
  );
};
