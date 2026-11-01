import { Avatar, FormBanner, StatCard } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { BackLink } from "@/components/BackLink";
import { getErrorMessage } from "@/lib/errorMessages";

import { TimelineSection } from "../../activities/components/TimelineSection";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { CustomerDetailSkeleton } from "../../components/CrmSkeletons";
import { ConnectedPeopleSection } from "../../connections/components/ConnectedPeopleSection";
import { ConnectedWorkSection } from "../../connections/components/ConnectedWorkSection";
import { formatDate, formatRupees } from "../../utils/format.utils";
import { crmRelationshipsApi } from "../api/relationshipsApi";
import { RecentOrdersSection } from "./RecentOrdersSection";

const routeApi = getRouteApi("/_authenticated/crm/customers/$userId");

export const CustomerDetailPage = () => {
  const { userId } = routeApi.useParams();
  const customerSubject = { subjectType: "customer", subjectId: userId } as const;
  const {
    data: customer,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-customer", userId],
    queryFn: () => crmRelationshipsApi.getCustomer(userId),
  });

  return (
    <div>
      <BackLink to="/crm/customers">All customers</BackLink>

      {isLoading && <CustomerDetailSkeleton />}
      {error && <FormBanner className="mt-4">{getErrorMessage(error)}</FormBanner>}

      {customer && (
        <div className="mt-4 space-y-6">
          <CrmPageHeader
            title={customer.name}
            leading={<Avatar name={customer.name} imageUrl={customer.avatarUrl} size="lg" />}
            description={`@${customer.handle} · customer since ${formatDate(customer.firstOrderAt)}`}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Orders" value={customer.orderCount.toLocaleString()} />
            <StatCard label="Items bought" value={customer.itemCount.toLocaleString()} />
            <StatCard label="Total paid" value={formatRupees(customer.totalPaid)} />
            <StatCard label="Last order" value={formatDate(customer.lastOrderAt)} />
          </div>

          <RecentOrdersSection
            title="Recent orders"
            description="The latest orders from this customer. Click one for details."
            emptyMessage="No orders yet."
            scopeNote="Only your products from this order are shown."
            orders={customer.recentOrders}
          />

          <ConnectedPeopleSection subject={customerSubject} />
          <ConnectedWorkSection subject={customerSubject} />
          <TimelineSection {...customerSubject} />
        </div>
      )}
    </div>
  );
};
