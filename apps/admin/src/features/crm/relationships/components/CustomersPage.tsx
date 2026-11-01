import { Avatar, FormBanner, SearchInput, Table, type TableColumn } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import { TableSkeleton } from "@/components/TableSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { CrmPageHeader } from "../../components/CrmPageHeader";
import { CrmPagination } from "../../components/CrmPagination";
import { CRM_PAGE_TEXT, CUSTOMER_TABLE_HEADERS } from "../../constants/crmPageContent";
import { useCrmListFilters } from "../../hooks/useCrmListFilters";
import { formatDate, formatRupees } from "../../utils/format.utils";
import { crmRelationshipsApi } from "../api/relationshipsApi";
import type { CustomerSummary } from "../api/relationshipsSchemas";

const PAGE_SIZE = 25;

const CUSTOMER_COLUMNS: TableColumn<CustomerSummary>[] = [
  {
    key: "shopper",
    header: "Shopper",
    render: ({ userId, name, handle, avatarUrl }) => (
      <span className="flex items-center gap-3">
        <Avatar name={name} imageUrl={avatarUrl} size="sm" />
        <span className="min-w-0">
          <Link
            to="/crm/customers/$userId"
            params={{ userId }}
            className="block font-semibold text-primary-strong underline"
          >
            {name}
          </Link>
          <span className="block text-xs text-muted-foreground">@{handle}</span>
        </span>
      </span>
    ),
  },
  { key: "orders", header: "Orders", render: ({ orderCount }) => orderCount.toLocaleString() },
  { key: "items", header: "Items", render: ({ itemCount }) => itemCount.toLocaleString() },
  { key: "paid", header: "Total paid", render: ({ totalPaid }) => formatRupees(totalPaid) },
  { key: "last", header: "Last order", render: ({ lastOrderAt }) => formatDate(lastOrderAt) },
];

export const CustomersPage = () => {
  const navigate = useNavigate();
  const { searchText, changeSearchText, search, page, goToPage } = useCrmListFilters();

  const {
    data: customerPage,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-customers", search, page],
    queryFn: () => crmRelationshipsApi.listCustomers({ q: search, page, pageSize: PAGE_SIZE }),
  });

  return (
    <div>
      <CrmPageHeader
        {...CRM_PAGE_TEXT.customers}
        actions={
          <SearchInput
            placeholder="Search shoppers"
            value={searchText}
            onValueChange={changeSearchText}
            className="w-64"
          />
        }
      />

      <div className="mt-6">
        {isLoading && <TableSkeleton headers={CUSTOMER_TABLE_HEADERS} />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}

        {customerPage && customerPage.reason === "ORGANIZATION_NOT_LINKED_TO_BRAND" && (
          <FormBanner tone="neutral">
            This organization isn&apos;t linked to a brand yet, so it has no customers.
          </FormBanner>
        )}

        {customerPage && customerPage.reason === null && customerPage.items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {search
              ? "No customers match your search. Try a shorter name."
              : "No customers yet. Shoppers appear here after their first order for your products."}
          </p>
        )}

        {customerPage && customerPage.items.length > 0 && (
          <>
            <Table
              caption="Customers"
              columns={CUSTOMER_COLUMNS}
              rows={customerPage.items}
              rowKey={({ userId }) => userId}
              onRowClick={({ userId }) =>
                void navigate({ to: "/crm/customers/$userId", params: { userId } })
              }
            />
            <CrmPagination
              total={customerPage.total}
              page={page}
              hasMore={customerPage.hasMore}
              onPageChange={goToPage}
            />
          </>
        )}
      </div>
    </div>
  );
};
