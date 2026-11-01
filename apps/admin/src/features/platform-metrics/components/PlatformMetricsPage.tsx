import {
  Button,
  CLICKABLE_STAT_CARD_CLASS_NAME,
  FilterChip,
  FormBanner,
  SearchInput,
  Select,
  STAT_CARD_LINK_CLASS_NAME,
  StatCard,
  StatCardSkeleton,
} from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { TableSkeleton } from "@/components/TableSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { platformMetricsApi } from "../api/platformMetricsApi";
import type { PlatformOverview, TenantSort } from "../api/platformMetricsSchemas";
import {
  TENANT_SORT_OPTIONS,
  TENANT_TABLE_HEADERS,
  TENANT_TOTAL_CARDS,
} from "../constants/tenantMetrics.constants";
import { useTenantFilters } from "../hooks/useTenantFilters";
import { toPlanLabel, toTenantCountLabel } from "../utils/tenantMetrics.utils";
import { TenantTable } from "./TenantTable";

const PAGE_SIZE = 25;
const OVERVIEW_STAT_COUNT = 5;
const FIRST_PAGE = 1;
const PAGE_STEP = 1;
const NO_TENANTS = 0;
const STAT_GRID_CLASS = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5";

const TenantTotals = ({
  overview,
  sort,
  onSort,
}: {
  overview: PlatformOverview;
  sort: TenantSort;
  onSort: (sort: TenantSort) => void;
}) => (
  <div className={STAT_GRID_CLASS}>
    {TENANT_TOTAL_CARDS.map(({ label, metricKey, sort: cardSort, hint }) => (
      <StatCard
        key={label}
        label={label}
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={overview[metricKey].toLocaleString()}
        hint={hint}
        footer={
          <button
            type="button"
            aria-pressed={sort === cardSort}
            onClick={() => onSort(cardSort)}
            className={STAT_CARD_LINK_CLASS_NAME}
          >
            {sort === cardSort ? "Sorted by this" : "Sort by this"}
          </button>
        }
      />
    ))}
  </div>
);

export const PlatformMetricsPage = () => {
  const { plan, sort, page, search, searchText, setSearchText, selectPlan, selectSort, goToPage } =
    useTenantFilters();

  const overview = useQuery({
    queryKey: ["platform-metrics-overview"],
    queryFn: platformMetricsApi.getOverview,
  });

  const tenants = useQuery({
    queryKey: ["platform-metrics-tenants", plan, search, sort, page],
    queryFn: () =>
      platformMetricsApi.listTenants({
        plan: plan || undefined,
        search,
        sort,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Tenant metrics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        How each business is using the CRM. Counts only, so their private contacts and sales stay
        private. Click a business to see its account and activity.
      </p>

      <div className="mt-6">
        {overview.isLoading && (
          <div className={STAT_GRID_CLASS} role="status" aria-label="Loading">
            {Array.from({ length: OVERVIEW_STAT_COUNT }, (_unused, statIndex) => (
              <StatCardSkeleton key={statIndex} />
            ))}
          </div>
        )}
        {overview.error && <FormBanner>{getErrorMessage(overview.error)}</FormBanner>}
        {overview.data && <TenantTotals overview={overview.data} sort={sort} onSort={selectSort} />}
      </div>

      <div
        className="mt-8 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filter by plan"
      >
        <FilterChip isSelected={plan === ""} onClick={() => selectPlan("")}>
          All plans
          {overview.data ? ` (${overview.data.tenantCount.toLocaleString()})` : ""}
        </FilterChip>
        {overview.data?.tenantsByPlan.map(({ plan: planName, count }) => (
          <FilterChip
            key={planName}
            isSelected={plan === planName}
            onClick={() => selectPlan(planName)}
          >
            {toPlanLabel(planName)} ({count.toLocaleString()})
          </FilterChip>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={searchText}
          onValueChange={setSearchText}
          placeholder="Search by business or subdomain"
          ariaLabel="Search businesses"
          className="w-72"
        />
        <Select
          value={sort}
          onChange={(event) => {
            const nextSort = TENANT_SORT_OPTIONS.find(({ value }) => value === event.target.value);
            if (nextSort) selectSort(nextSort.value);
          }}
          className="w-48"
          aria-label="Sort businesses"
        >
          {TENANT_SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        {tenants.isLoading && <TableSkeleton headers={TENANT_TABLE_HEADERS} />}
        {tenants.error && <FormBanner>{getErrorMessage(tenants.error)}</FormBanner>}
        {tenants.data && tenants.data.items.length === NO_TENANTS && (
          <p className="text-sm text-muted-foreground">No businesses match this filter.</p>
        )}
        {tenants.data && tenants.data.items.length > NO_TENANTS && (
          <>
            <TenantTable tenants={tenants.data.items} sort={sort} onSort={selectSort} />

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{toTenantCountLabel(tenants.data.total)}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === FIRST_PAGE}
                  onClick={() => goToPage(page - PAGE_STEP)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!tenants.data.hasMore}
                  onClick={() => goToPage(page + PAGE_STEP)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
