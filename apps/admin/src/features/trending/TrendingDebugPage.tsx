import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  Badge,
  Skeleton,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ApiClientError } from "@/lib/apiClient";

import { trendingApi } from "./api";
import type { BaselineSourceValue, TrendDebugSubject, TrendingProductSummary } from "./schemas";

const PRODUCT_SEARCH_DEBOUNCE_MS = 300;

const BASELINE_SOURCE_LABEL: Record<BaselineSourceValue, string> = {
  product: "this product's own trailing history",
  category: "similar products of the same type",
  global: "the whole catalog",
};

const formatNumber = (value: number): string =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const StatCard = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 font-display text-xl font-bold text-foreground">{value}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const ActivityStat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg bg-muted px-3 py-2 text-center">
    <p className="font-display text-lg font-bold text-foreground">{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
  </div>
);

const TrendDebugResult = ({ product }: { product: TrendDebugSubject }) => {
  const snapshot = useQuery({
    queryKey: ["trend-debug", product.id],
    queryFn: () => trendingApi.getDebugSnapshot(product.id),
  });

  if (snapshot.isLoading) {
    return (
      <div className="mt-6 space-y-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (snapshot.error) {
    const notFound =
      snapshot.error instanceof ApiClientError && snapshot.error.code === "PRODUCT_NOT_FOUND";
    return (
      <p className="mt-6 text-sm text-destructive">
        {notFound
          ? "This product isn't approved or no longer exists."
          : "Couldn't load trend data for this product."}
      </p>
    );
  }

  const data = snapshot.data;
  if (!data) return null;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Trending score" value={formatNumber(data.score)} />
        <StatCard
          label="Rank"
          value={data.rank ? `#${data.rank}` : "Not trending"}
          hint={data.rank ? "Position among today's trending candidates" : "No score above zero"}
        />
        <StatCard
          label="Freshness boost"
          value={
            data.freshnessMultiplier > 1 ? `×${formatNumber(data.freshnessMultiplier)}` : "None"
          }
          hint={data.freshnessMultiplier > 1 ? "Product is 3 days old or newer" : undefined}
        />
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Activity in the last 6 hours
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <ActivityStat label="Purchases" value={data.recentActivity.purchaseUnits} />
          <ActivityStat label="Cart adds" value={data.recentActivity.cartAdds} />
          <ActivityStat label="Saves" value={data.recentActivity.saves} />
          <ActivityStat label="Creator tags" value={data.recentActivity.creatorTags} />
          <ActivityStat label="Tag clicks" value={data.recentActivity.tagClicks} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Why it scored this way
        </h3>
        <div className="mt-2 space-y-2 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
          <p>
            Activity right now:{" "}
            <span className="font-semibold">{formatNumber(data.decayedActivity)}</span>. Previous 6
            hours:{" "}
            <span className="font-semibold">{formatNumber(data.previousWindowActivity)}</span>.
            That&apos;s a velocity of{" "}
            <span className="font-semibold">{formatNumber(data.velocity)}×</span>.
          </p>
          <p>
            Baseline ({BASELINE_SOURCE_LABEL[data.baseline.source]}):{" "}
            <span className="font-semibold">{formatNumber(data.baseline.value)}</span>. That&apos;s
            a lift of <span className="font-semibold">{formatNumber(data.baselineLift)}×</span>{" "}
            above normal.
          </p>
          <p>
            Velocity and baseline lift combine into a momentum of{" "}
            <span className="font-semibold">{formatNumber(data.momentum)}×</span>. This is capped so
            one spike can&apos;t take over the rankings.
          </p>
          <p className="text-xs text-muted-foreground">
            Scored at {new Date(data.scoredAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const TopTrendingList = ({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (entry: TrendingProductSummary) => void;
}) => {
  const topTrending = useQuery({
    queryKey: ["trend-debug-top-products"],
    queryFn: () => trendingApi.listTopTrending(),
  });

  if (topTrending.isLoading) {
    return (
      <div className="mt-3 space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (topTrending.error) {
    return <p className="mt-3 text-sm text-destructive">Couldn&apos;t load the trending list.</p>;
  }

  const entries = topTrending.data ?? [];
  if (entries.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Nothing is trending yet. Check back once there&apos;s real purchase, cart, save, or
        creator-tag activity.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-1.5">
      {entries.map((entry) => (
        <li key={entry.productId}>
          <button
            type="button"
            onClick={() => onSelect(entry)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
              selectedId === entry.productId
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            <span className="font-display text-sm font-bold text-muted-foreground">
              #{entry.rank}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {entry.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{entry.brand}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
              {formatNumber(entry.score)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

export const TrendingDebugPage = () => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<TrendDebugSubject | null>(null);
  const debouncedQuery = useDebouncedValue(query, PRODUCT_SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.trim().length > 0;

  const search = useQuery({
    queryKey: ["trend-debug-product-search", debouncedQuery],
    queryFn: () => trendingApi.searchProducts(debouncedQuery),
    enabled: isSearching,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Trending debug</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        See what&apos;s trending right now, or look up any approved product to see exactly why it
        is, or isn&apos;t, trending.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div>
          <label htmlFor="trend-debug-search" className="text-xs text-muted-foreground">
            Search for a specific product
          </label>
          <Autocomplete>
            <AutocompleteInput
              id="trend-debug-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              placeholder="Search by product name"
              className="mt-1.5"
            />

            {isSearching && (
              <AutocompleteContent className="mt-2">
                {search.isLoading &&
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-9 rounded-md" />
                  ))}

                {!search.isLoading && (search.data ?? []).length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No products found for &ldquo;{debouncedQuery}&rdquo;
                  </p>
                )}

                {(search.data ?? []).map((product) => (
                  <AutocompleteItem
                    key={product.id}
                    value={product.id}
                    onSelect={() => {
                      setSelected({ id: product.id, name: product.name, brand: product.brand });
                      setQuery(product.name);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {product.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {product.brand} &middot; Rs. {product.price.toLocaleString()}
                      </span>
                    </span>
                  </AutocompleteItem>
                ))}
              </AutocompleteContent>
            )}
          </Autocomplete>

          <h2 className="mt-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Top trending right now
          </h2>
          <TopTrendingList
            selectedId={selected?.id ?? null}
            onSelect={(entry) => {
              setSelected({ id: entry.productId, name: entry.name, brand: entry.brand });
              setQuery("");
            }}
          />
        </div>

        <div>
          {selected ? (
            <>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-foreground">{selected.name}</h2>
                <Badge tone="neutral" showDot={false}>
                  {selected.brand}
                </Badge>
              </div>
              <TrendDebugResult product={selected} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pick a product from the trending list or search results to see its breakdown.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
