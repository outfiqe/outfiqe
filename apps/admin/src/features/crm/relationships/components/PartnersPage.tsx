import { FormBanner, SearchInput, Table, type TableColumn } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import { TableSkeleton } from "@/components/TableSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { CrmPageHeader } from "../../components/CrmPageHeader";
import { CrmPagination } from "../../components/CrmPagination";
import { CRM_PAGE_TEXT, PARTNER_TABLE_HEADERS } from "../../constants/crmPageContent";
import { useCrmListFilters } from "../../hooks/useCrmListFilters";
import { formatDate, formatRupees } from "../../utils/format.utils";
import { crmRelationshipsApi } from "../api/relationshipsApi";
import type { PartnerSummary } from "../api/relationshipsSchemas";

const PAGE_SIZE = 25;

const PARTNER_COLUMNS: TableColumn<PartnerSummary>[] = [
  {
    key: "muse",
    header: "Muse",
    render: ({ creatorId, name, handle }) => (
      <>
        <Link
          to="/crm/partners/$creatorId"
          params={{ creatorId }}
          className="font-semibold text-primary-strong underline"
        >
          {name}
        </Link>
        <span className="ml-2 text-muted-foreground">@{handle}</span>
      </>
    ),
  },
  {
    key: "clicks",
    header: "Tag clicks",
    render: ({ tagClickCount }) => tagClickCount.toLocaleString(),
  },
  {
    key: "orders",
    header: "Orders they brought",
    render: ({ attributedOrderCount }) => attributedOrderCount.toLocaleString(),
  },
  {
    key: "sales",
    header: "Sales they brought",
    render: ({ attributedRevenue }) => formatRupees(attributedRevenue),
  },
  {
    key: "activity",
    header: "Last activity",
    render: ({ lastActivityAt }) => formatDate(lastActivityAt),
  },
];

export const PartnersPage = () => {
  const navigate = useNavigate();
  const { searchText, changeSearchText, search, page, goToPage } = useCrmListFilters();

  const {
    data: partnerPage,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-partners", search, page],
    queryFn: () => crmRelationshipsApi.listPartners({ q: search, page, pageSize: PAGE_SIZE }),
  });

  return (
    <div>
      <CrmPageHeader
        {...CRM_PAGE_TEXT.partners}
        actions={
          <SearchInput
            placeholder="Search muses"
            value={searchText}
            onValueChange={changeSearchText}
            className="w-64"
          />
        }
      />

      <div className="mt-6">
        {isLoading && <TableSkeleton headers={PARTNER_TABLE_HEADERS} />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}

        {partnerPage && partnerPage.reason === "ORGANIZATION_NOT_LINKED_TO_BRAND" && (
          <FormBanner tone="neutral">
            This organization isn&apos;t linked to a brand yet, so it has no partners.
          </FormBanner>
        )}

        {partnerPage && partnerPage.reason === null && partnerPage.items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {search
              ? "No partners match your search. Try a shorter name."
              : "No partners yet. Muses appear here once they link or tag your products, or bring in an order."}
          </p>
        )}

        {partnerPage && partnerPage.items.length > 0 && (
          <>
            <Table
              caption="Partners"
              columns={PARTNER_COLUMNS}
              rows={partnerPage.items}
              rowKey={({ creatorId }) => creatorId}
              onRowClick={({ creatorId }) =>
                void navigate({ to: "/crm/partners/$creatorId", params: { creatorId } })
              }
            />
            <CrmPagination
              total={partnerPage.total}
              page={page}
              hasMore={partnerPage.hasMore}
              onPageChange={goToPage}
            />
          </>
        )}
      </div>
    </div>
  );
};
