import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { MetricEmptyState, MetricSection } from "@/components/MetricParts";

import { formatRupees } from "../../utils/format.utils";
import type { RelationshipOrder } from "../api/relationshipsSchemas";
import { PRODUCT_ROW_CLASS_NAME } from "../constants/productRow";
import { toOrderHeadline, toOrderStatusLine } from "../utils/orderRow.utils";
import { OrderPanel } from "./OrderPanel";
import { ProductThumbnail } from "./ProductThumbnail";

export const RecentOrdersSection = ({
  title,
  description,
  emptyMessage,
  scopeNote,
  orders,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  scopeNote: string;
  orders: RelationshipOrder[];
}) => {
  const [selectedOrder, setSelectedOrder] = useState<RelationshipOrder | null>(null);

  return (
    <MetricSection title={title} description={description}>
      {orders.length === 0 ? (
        <MetricEmptyState>{emptyMessage}</MetricEmptyState>
      ) : (
        orders.map((order) => {
          const [firstLine] = order.lines;
          return (
            <button
              key={order.orderId}
              type="button"
              onClick={() => setSelectedOrder(order)}
              className={PRODUCT_ROW_CLASS_NAME}
            >
              <ProductThumbnail imageUrl={firstLine.imageUrl} productName={firstLine.productName} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 break-words font-medium text-foreground sm:block sm:truncate">
                  {toOrderHeadline(order)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {toOrderStatusLine(order)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 font-semibold text-foreground">
                {formatRupees(order.brandSubtotal)}
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </span>
            </button>
          );
        })
      )}

      {selectedOrder && (
        <OrderPanel
          order={selectedOrder}
          scopeNote={scopeNote}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </MetricSection>
  );
};
