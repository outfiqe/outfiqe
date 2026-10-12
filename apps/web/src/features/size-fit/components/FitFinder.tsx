"use client";

import { Button, FilterChip, Input } from "@outfiqe/design-system";
import type { FitMeasurements } from "@outfiqe/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { ProductCard } from "@/features/landing/components/ProductCard";
import { toExploreProduct } from "@/features/products/api/toExploreProduct";
import { useProductTypes } from "@/features/products/hooks/useProductTypes";
import { useFeatureFlag } from "@/shared/hooks/useFeatureFlag";
import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

import { useInfiniteFittingProducts } from "../hooks/useInfiniteFittingProducts";
import { useShopperMeasurements } from "../hooks/useShopperMeasurements";
import { rememberDeviceMeasurements } from "../utils/deviceMeasurements";
import { buildFitPagePath } from "../utils/fitPagePath";
import { toFitMeasurements, toMeasurementDraft } from "../utils/measurementDraft";

const SINGLE_RESULT = 1;
const OUT_OF_BOUNDS_MESSAGE =
  "Enter a height from 50 to 230 cm and a weight from 10 to 200 kg, in whole numbers.";

type MeasurementsSearchFormProps = {
  initialMeasurements: FitMeasurements | null;
  onSearch: (measurements: FitMeasurements) => void;
};

const MeasurementsSearchForm = ({ initialMeasurements, onSearch }: MeasurementsSearchFormProps) => {
  const heightInputId = useId();
  const weightInputId = useId();
  const [draft, setDraft] = useState(() => toMeasurementDraft(initialMeasurements));
  const [isInvalid, setIsInvalid] = useState(false);

  return (
    <form
      noValidate
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const measurements = toFitMeasurements(draft);
        setIsInvalid(measurements === null);
        if (measurements) onSearch(measurements);
      }}
    >
      <div className="w-32">
        <label htmlFor={heightInputId} className="mb-1.5 block text-sm font-medium text-foreground">
          Height (cm)
        </label>
        <Input
          id={heightInputId}
          inputMode="numeric"
          placeholder="165"
          value={draft.heightCm}
          aria-invalid={isInvalid}
          onChange={(event) => setDraft({ ...draft, heightCm: event.target.value })}
        />
      </div>
      <div className="w-32">
        <label htmlFor={weightInputId} className="mb-1.5 block text-sm font-medium text-foreground">
          Weight (kg)
        </label>
        <Input
          id={weightInputId}
          inputMode="numeric"
          placeholder="60"
          value={draft.weightKg}
          aria-invalid={isInvalid}
          onChange={(event) => setDraft({ ...draft, weightKg: event.target.value })}
        />
      </div>
      <Button type="submit">Show what fits</Button>
      {isInvalid && (
        <p role="alert" className="w-full text-sm text-destructive">
          {OUT_OF_BOUNDS_MESSAGE}
        </p>
      )}
    </form>
  );
};

export const FitFinder = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSizeFitOn = useFeatureFlag("size_fit");
  const shopperMeasurements = useShopperMeasurements();
  const productTypes = useProductTypes();
  const measurementsFromLink = toFitMeasurements({
    heightCm: searchParams.get("heightCm") ?? "",
    weightKg: searchParams.get("weightKg") ?? "",
  });
  const activeType = searchParams.get("type") ?? undefined;
  const fittingProducts = useInfiniteFittingProducts(measurementsFromLink, activeType, isSizeFitOn);
  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    fittingProducts;
  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  const fitTypes = (productTypes.data ?? []).filter(
    ({ supportsFitRanges }) => supportsFitRanges !== false,
  );
  const initialMeasurements = measurementsFromLink ?? shopperMeasurements;
  const products = data?.pages.flatMap((page) => page.products) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const showResultsFor = (measurements: FitMeasurements, type: string | undefined) => {
    rememberDeviceMeasurements(measurements);
    router.replace(buildFitPagePath(measurements, type), { scroll: false });
  };

  if (!isSizeFitOn) {
    return (
      <p className="text-sm text-muted-foreground">
        Find what fits me isn&apos;t open yet.{" "}
        <Link href="/shop" className="font-medium text-foreground underline underline-offset-2">
          Browse the shop
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <MeasurementsSearchForm
        key={
          initialMeasurements
            ? `${initialMeasurements.heightCm}-${initialMeasurements.weightKg}`
            : "no-measurements"
        }
        initialMeasurements={initialMeasurements}
        onSearch={(measurements) => showResultsFor(measurements, activeType)}
      />

      {measurementsFromLink && fitTypes.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Kind of clothing">
          <FilterChip
            isSelected={activeType === undefined}
            onClick={() => showResultsFor(measurementsFromLink, undefined)}
          >
            Everything
          </FilterChip>
          {fitTypes.map(({ slug, label }) => (
            <FilterChip
              key={slug}
              isSelected={activeType === slug}
              onClick={() => showResultsFor(measurementsFromLink, slug)}
            >
              {label}
            </FilterChip>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {!measurementsFromLink ? (
          <p className="text-sm text-muted-foreground">
            Enter your height and weight to see every piece in stock that is cut for you.
          </p>
        ) : isLoading ? (
          <ProductGridSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load what fits you right now.
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Nothing in stock is cut for {measurementsFromLink.heightCm} cm and{" "}
              {measurementsFromLink.weightKg} kg yet.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/shop">Browse everything</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {total === SINGLE_RESULT ? "1 piece fits you" : `${total} pieces fit you`}
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={toExploreProduct(product)} />
                  {product.recommendedSize && (
                    <p className="mt-2 text-xs font-semibold text-foreground">
                      Your size: {product.recommendedSize.label}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center">
          <span className="text-xs text-muted-foreground">
            {isFetchingNextPage ? "Loading more…" : ""}
          </span>
        </div>
      )}
    </div>
  );
};
