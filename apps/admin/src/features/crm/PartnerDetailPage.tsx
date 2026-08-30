import { FormBanner, Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";

import { getErrorMessage } from "@/lib/errorMessages";

import { formatDate, formatRupees } from "./format.utils";
import { crmRelationshipsApi } from "./relationshipsApi";
import { TimelineSection } from "./TimelineSection";

const routeApi = getRouteApi("/_authenticated/crm/partners/$creatorId");

export const PartnerDetailPage = () => {
  const { creatorId } = routeApi.useParams();
  const {
    data: partner,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-partner", creatorId],
    queryFn: () => crmRelationshipsApi.getPartner(creatorId),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/crm/partners" className="text-sm font-semibold text-primary-strong underline">
        ← Back to partners
      </Link>

      {isLoading && <Skeleton className="mt-4 h-40 w-full" />}
      {error && <FormBanner className="mt-4">{getErrorMessage(error)}</FormBanner>}

      {partner && (
        <div className="mt-4 space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{partner.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              @{partner.handle} · {partner.tagClickCount.toLocaleString()} tag clicks ·{" "}
              {partner.attributedOrderCount.toLocaleString()} attributed orders ·{" "}
              {formatRupees(partner.attributedRevenue)} attributed revenue
            </p>
          </div>

          <section>
            <h2 className="font-display text-base font-bold text-foreground">Per product</h2>
            {partner.productBreakdown.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No product-level activity.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Product</th>
                      <th className="py-2 pr-4">Tag clicks</th>
                      <th className="py-2 pr-4">Orders</th>
                      <th className="py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partner.productBreakdown.map((row) => (
                      <tr key={row.productId} className="border-t border-border">
                        <td className="py-2 pr-4">{row.productName}</td>
                        <td className="py-2 pr-4">{row.tagClickCount.toLocaleString()}</td>
                        <td className="py-2 pr-4">{row.attributedOrderCount.toLocaleString()}</td>
                        <td className="py-2">{formatRupees(row.attributedRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-foreground">
              Recent attributed orders
            </h2>
            {partner.recentAttributedOrders.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No attributed orders yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {partner.recentAttributedOrders.map((order) => (
                  <li key={order.orderItemId} className="rounded-lg border border-border p-3">
                    {order.productName} × {order.qty} · {formatRupees(order.unitPrice * order.qty)}{" "}
                    · {order.paymentStatus.toLowerCase()} / {order.fulfilmentStatus.toLowerCase()} ·{" "}
                    {formatDate(order.createdAt)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <TimelineSection subjectType="partner" subjectId={creatorId} />
        </div>
      )}
    </div>
  );
};
