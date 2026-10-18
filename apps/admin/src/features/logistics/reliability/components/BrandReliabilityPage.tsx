import { Badge, FormBanner, Skeleton } from "@outfiqe/design-system";

import type { ReliabilityLevel } from "../api/reliabilitySchemas";
import { RELIABILITY_LEVEL_LABELS } from "../constants/reliabilityLabels";
import { useBrandsToWatch } from "../hooks/useBrandsToWatch";

const NO_BRANDS = 0;
const SKELETON_ROW_COUNT = 4;

const LEVEL_TONES: Record<ReliabilityLevel, "positive" | "neutral" | "negative"> = {
  GOOD: "positive",
  WARNING: "neutral",
  REVIEW: "negative",
};

export const BrandReliabilityPage = () => {
  const { data: brands, isPending, isError } = useBrandsToWatch();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Brand reliability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Brands with 3 or more problems in the last 30 days: missing items, failed quality checks
          and wasted rider visits. A brand is warned at 5 problems that are more than 10% of its
          pickups, and needs review at 10 that are more than 20%. Brands new to Outfiqe pickup
          (first 30 days or first 20 pickups) are never warned. Reaching out early, and any
          suspension, stays your decision.
        </p>
      </div>

      {isError && <FormBanner>We couldn&apos;t load brand reliability.</FormBanner>}
      {isPending && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading brand reliability">
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}
      {brands && brands.length === NO_BRANDS && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No brand has had 3 or more problems in the last 30 days.
        </p>
      )}
      {brands && brands.length > NO_BRANDS && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {brands.map(
            ({
              brandId,
              brandName,
              incidentCount,
              pickupCount,
              incidentRatePercent,
              isNewToPickup,
              level,
            }) => (
              <li key={brandId} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium text-foreground">{brandName}</p>
                  <p className="text-sm text-muted-foreground">
                    {incidentCount} problems in 30 days · {pickupCount} pickups (
                    {incidentRatePercent}%)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isNewToPickup && (
                    <Badge tone="neutral" showDot={false}>
                      New to pickup
                    </Badge>
                  )}
                  <Badge tone={LEVEL_TONES[level]} showDot={false}>
                    {RELIABILITY_LEVEL_LABELS[level]}
                  </Badge>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
};
