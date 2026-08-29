import { Button, FormBanner, Input, Skeleton } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import { CrmTabs } from "./CrmTabs";
import { crmRelationshipsApi } from "./relationshipsApi";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const formatRupees = (amount: number) => `Rs. ${amount.toLocaleString()}`;
const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

export const CustomersPage = () => {
  const { data: organization } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(searchTerm, SEARCH_DEBOUNCE_MS);

  const {
    data: customerPage,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-customers", debounced, page],
    queryFn: () =>
      crmRelationshipsApi.listCustomers({ q: debounced || undefined, page, pageSize: PAGE_SIZE }),
  });

  return (
    <div>
      {organization && (
        <CrmTabs
          viewerIsSuperAdmin={organization.viewerIsSuperAdmin}
          viewerPermissionKeys={organization.viewerPermissionKeys}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-foreground">Customers</h1>
        <Input
          type="search"
          placeholder="Search shoppers"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(1);
          }}
          className="w-64"
        />
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        Shoppers who have bought your brand&apos;s products.
      </p>

      <div className="mt-6">
        {isLoading && <Skeleton className="h-40 w-full" />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}

        {customerPage && customerPage.reason === "ORGANIZATION_NOT_LINKED_TO_BRAND" && (
          <FormBanner tone="neutral">
            This organization isn&apos;t linked to a brand yet, so it has no customers.
          </FormBanner>
        )}

        {customerPage && customerPage.reason === null && customerPage.items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {debounced ? "No customers match your search." : "No customers yet."}
          </p>
        )}

        {customerPage && customerPage.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Shopper</th>
                  <th className="py-2 pr-4">Orders</th>
                  <th className="py-2 pr-4">Items</th>
                  <th className="py-2 pr-4">Total paid</th>
                  <th className="py-2">Last order</th>
                </tr>
              </thead>
              <tbody>
                {customerPage.items.map((customer) => (
                  <tr key={customer.userId} className="border-t border-border">
                    <td className="py-2 pr-4">
                      <Link
                        to="/crm/customers/$userId"
                        params={{ userId: customer.userId }}
                        className="font-semibold text-primary-strong underline"
                      >
                        {customer.name}
                      </Link>
                      <span className="ml-2 text-muted-foreground">@{customer.handle}</span>
                    </td>
                    <td className="py-2 pr-4">{customer.orderCount.toLocaleString()}</td>
                    <td className="py-2 pr-4">{customer.itemCount.toLocaleString()}</td>
                    <td className="py-2 pr-4">{formatRupees(customer.totalPaid)}</td>
                    <td className="py-2">{formatDate(customer.lastOrderAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{customerPage.total} total</span>
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
                  disabled={!customerPage.hasMore}
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
