import { FormBanner, Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";

import { getErrorMessage } from "@/lib/errorMessages";

import { formatDate, formatRupees } from "./format.utils";
import { crmRelationshipsApi } from "./relationshipsApi";
import { TimelineSection } from "./TimelineSection";

const routeApi = getRouteApi("/_authenticated/crm/customers/$userId");

export const CustomerDetailPage = () => {
  const { userId } = routeApi.useParams();
  const {
    data: customer,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-customer", userId],
    queryFn: () => crmRelationshipsApi.getCustomer(userId),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/crm/customers" className="text-sm font-semibold text-primary-strong underline">
        ← Back to customers
      </Link>

      {isLoading && <Skeleton className="mt-4 h-40 w-full" />}
      {error && <FormBanner className="mt-4">{getErrorMessage(error)}</FormBanner>}

      {customer && (
        <div className="mt-4 space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{customer.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              @{customer.handle} · {customer.orderCount.toLocaleString()} orders ·{" "}
              {customer.itemCount.toLocaleString()} items · {formatRupees(customer.totalPaid)} paid
              · first order {formatDate(customer.firstOrderAt)}
            </p>
          </div>

          <section>
            <h2 className="font-display text-base font-bold text-foreground">Recent orders</h2>
            {customer.recentOrders.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {customer.recentOrders.map((order) => (
                  <li key={order.orderId} className="rounded-lg border border-border p-3">
                    {order.itemCount} item{order.itemCount === 1 ? "" : "s"} ·{" "}
                    {formatRupees(order.brandSubtotal)} · {order.paymentStatus.toLowerCase()} /{" "}
                    {order.fulfilmentStatus.toLowerCase()} · {formatDate(order.createdAt)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <TimelineSection subjectType="customer" subjectId={userId} />
        </div>
      )}
    </div>
  );
};
