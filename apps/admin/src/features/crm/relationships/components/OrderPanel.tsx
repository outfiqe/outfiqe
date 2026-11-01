import { Drawer, DrawerScrollArea } from "@outfiqe/design-system";

import { MetricRow } from "@/components/MetricParts";

import { formatDate, formatRupees, toPlainWords } from "../../utils/format.utils";
import type { RelationshipOrder, RelationshipOrderLine } from "../api/relationshipsSchemas";
import { toOrderReference, toPaymentMethodLabel } from "../utils/orderRow.utils";
import { toPublicProductUrl } from "../utils/productUrl.utils";
import { ProductThumbnail } from "./ProductThumbnail";

const NOTHING_REFUNDED = 0;

const OrderLine = ({ line }: { line: RelationshipOrderLine }) => {
  const { productId, productName, imageUrl, sizeLabel, qty, unitPrice, refundedQty, isLive } = line;

  return (
    <li className="flex items-center gap-3 border-b border-border/60 py-2.5 text-sm last:border-0">
      <ProductThumbnail imageUrl={imageUrl} productName={productName} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">{productName}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Size {sizeLabel} × {qty}
          {refundedQty > NOTHING_REFUNDED && ` · ${refundedQty} refunded`}
        </span>
        {isLive && (
          <a
            href={toPublicProductUrl(productId)}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 block text-xs font-medium text-foreground underline underline-offset-4"
          >
            See it on Outfiqe
          </a>
        )}
      </span>
      <span className="shrink-0 font-semibold text-foreground">
        {formatRupees(qty * unitPrice)}
      </span>
    </li>
  );
};

export const OrderPanel = ({
  order,
  scopeNote,
  onClose,
}: {
  order: RelationshipOrder;
  scopeNote: string;
  onClose: () => void;
}) => {
  const { orderId, lines, paymentMethod, paymentStatus, fulfilmentStatus } = order;
  const { createdAt, deliveredAt, brandSubtotal } = order;

  return (
    <Drawer open onClose={onClose} title={`Order ${toOrderReference(orderId)}`}>
      <DrawerScrollArea className="space-y-5 p-5">
        <div>
          <ul>
            {lines.map((line) => (
              <OrderLine key={line.orderItemId} line={line} />
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{scopeNote}</p>
        </div>
        <div>
          <MetricRow label="Total" value={formatRupees(brandSubtotal)} />
          <MetricRow label="Payment" value={toPlainWords(paymentStatus)} />
          <MetricRow label="Payment method" value={toPaymentMethodLabel(paymentMethod)} />
          <MetricRow label="Delivery" value={toPlainWords(fulfilmentStatus)} />
          <MetricRow label="Placed" value={formatDate(createdAt)} />
          {deliveredAt && <MetricRow label="Delivered" value={formatDate(deliveredAt)} />}
        </div>
      </DrawerScrollArea>
    </Drawer>
  );
};
