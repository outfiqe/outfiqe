import { Button, FormBanner, Select, Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { platformMetricsApi } from "./api";
import type { TenantSort } from "./schemas";

const PAGE_SIZE = 25;

const compactNumber = (value: number) => value.toLocaleString();

const formatDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 font-display text-2xl font-bold text-foreground">{compactNumber(value)}</p>
  </div>
);

export const PlatformMetricsPage = () => {
  const [planFilter, setPlanFilter] = useState("");
  const [sort, setSort] = useState<TenantSort>("recent-activity");
  const [page, setPage] = useState(1);

  const overview = useQuery({
    queryKey: ["platform-metrics-overview"],
    queryFn: platformMetricsApi.getOverview,
  });

  const tenants = useQuery({
    queryKey: ["platform-metrics-tenants", planFilter, sort, page],
    queryFn: () =>
      platformMetricsApi.listTenants({
        plan: planFilter || undefined,
        sort,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const planOptions = overview.data?.tenantsByPlan.map((entry) => entry.plan) ?? [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Tenant metrics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Aggregate activity across every CRM tenant. Counts only — no tenant records are shown here.
      </p>

      <div className="mt-6">
        {overview.isLoading && <Skeleton className="h-24 w-full" />}
        {overview.error && <FormBanner>{getErrorMessage(overview.error)}</FormBanner>}
        {overview.data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Tenants" value={overview.data.tenantCount} />
            <StatCard label="Members" value={overview.data.totalMembers} />
            <StatCard label="Contacts" value={overview.data.totalContacts} />
            <StatCard label="Deals" value={overview.data.totalDeals} />
            <StatCard label="Tickets" value={overview.data.totalTickets} />
            <StatCard label="Activities" value={overview.data.totalActivities} />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Select
          value={planFilter}
          onChange={(event) => {
            setPlanFilter(event.target.value);
            setPage(1);
          }}
          className="w-40"
          aria-label="Filter by plan"
        >
          <option value="">All plans</option>
          {planOptions.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(event) => setSort(event.target.value as TenantSort)}
          className="w-48"
          aria-label="Sort tenants"
        >
          <option value="recent-activity">Recent activity</option>
          <option value="name">Name</option>
          <option value="created">Newest</option>
        </Select>
      </div>

      <div className="mt-4">
        {tenants.isLoading && <Skeleton className="h-40 w-full" />}
        {tenants.error && <FormBanner>{getErrorMessage(tenants.error)}</FormBanner>}
        {tenants.data && tenants.data.items.length === 0 && (
          <p className="text-sm text-muted-foreground">No tenants match this filter.</p>
        )}
        {tenants.data && tenants.data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Tenant</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Members</th>
                  <th className="py-2 pr-4">Contacts</th>
                  <th className="py-2 pr-4">Deals</th>
                  <th className="py-2 pr-4">Tickets</th>
                  <th className="py-2">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {tenants.data.items.map((tenant) => (
                  <tr key={tenant.organizationId} className="border-t border-border">
                    <td className="py-2 pr-4">
                      <Link
                        to="/platform/metrics/$orgId"
                        params={{ orgId: tenant.organizationId }}
                        className="font-semibold text-primary-strong underline"
                      >
                        {tenant.name}
                      </Link>
                      <span className="ml-2 text-muted-foreground">{tenant.subdomain}</span>
                    </td>
                    <td className="py-2 pr-4">
                      {tenant.plan}
                      {tenant.subscriptionStatus && (
                        <span className="ml-1 text-muted-foreground">
                          ({tenant.subscriptionStatus.toLowerCase()})
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{compactNumber(tenant.memberCount)}</td>
                    <td className="py-2 pr-4">{compactNumber(tenant.contactCount)}</td>
                    <td className="py-2 pr-4">{compactNumber(tenant.dealCount)}</td>
                    <td className="py-2 pr-4">{compactNumber(tenant.ticketCount)}</td>
                    <td className="py-2">{formatDay(tenant.lastCrmActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{tenants.data.total} tenants</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!tenants.data.hasMore}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
