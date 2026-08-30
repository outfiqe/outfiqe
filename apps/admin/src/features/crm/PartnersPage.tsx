import { Button, FormBanner, Input, Skeleton } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { formatDate, formatRupees } from "./format.utils";
import { crmRelationshipsApi } from "./relationshipsApi";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export const PartnersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(searchTerm, SEARCH_DEBOUNCE_MS);

  const {
    data: partnerPage,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-partners", debounced, page],
    queryFn: () =>
      crmRelationshipsApi.listPartners({ q: debounced || undefined, page, pageSize: PAGE_SIZE }),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-foreground">Partners</h1>
        <Input
          type="search"
          placeholder="Search creators"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(1);
          }}
          className="w-64"
        />
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        Creators who have linked, tagged, or driven a sale of your brand&apos;s products.
      </p>

      <div className="mt-6">
        {isLoading && <Skeleton className="h-40 w-full" />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}

        {partnerPage && partnerPage.reason === "ORGANIZATION_NOT_LINKED_TO_BRAND" && (
          <FormBanner tone="neutral">
            This organization isn&apos;t linked to a brand yet, so it has no partners.
          </FormBanner>
        )}

        {partnerPage && partnerPage.reason === null && partnerPage.items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {debounced ? "No partners match your search." : "No partners yet."}
          </p>
        )}

        {partnerPage && partnerPage.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Creator</th>
                  <th className="py-2 pr-4">Tag clicks</th>
                  <th className="py-2 pr-4">Attributed orders</th>
                  <th className="py-2 pr-4">Attributed revenue</th>
                  <th className="py-2">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {partnerPage.items.map((partner) => (
                  <tr key={partner.creatorId} className="border-t border-border">
                    <td className="py-2 pr-4">
                      <Link
                        to="/crm/partners/$creatorId"
                        params={{ creatorId: partner.creatorId }}
                        className="font-semibold text-primary-strong underline"
                      >
                        {partner.name}
                      </Link>
                      <span className="ml-2 text-muted-foreground">@{partner.handle}</span>
                    </td>
                    <td className="py-2 pr-4">{partner.tagClickCount.toLocaleString()}</td>
                    <td className="py-2 pr-4">{partner.attributedOrderCount.toLocaleString()}</td>
                    <td className="py-2 pr-4">{formatRupees(partner.attributedRevenue)}</td>
                    <td className="py-2">{formatDate(partner.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{partnerPage.total} total</span>
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
                  disabled={!partnerPage.hasMore}
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
