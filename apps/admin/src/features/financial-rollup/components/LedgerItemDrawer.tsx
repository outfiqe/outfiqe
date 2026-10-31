import { Drawer, FormBanner, Skeleton } from "@outfiqe/design-system";
import { formatDate, formatDateTime } from "@outfiqe/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { financialRollupApi } from "../api/financialRollupApi";
import type { LedgerItem } from "../api/financialRollupSchemas";
import {
  BRAND_PAYOUT_STATUS_LABEL,
  COMMISSION_STATUS_LABEL,
  money,
  PAYMENT_METHOD_LABEL,
  toCommissionSourceLabel,
  toOrderStatusLabel,
} from "../constants/financialRollup.constants";

const NO_DISCOUNT = 0;
const NOTHING_REFUNDED = 0;
const SINGLE_ITEM_ORDER = 1;
const SKELETON_ROW_COUNT = 6;

const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-0">
    <dt className="shrink-0 text-muted-foreground">{label}</dt>
    <dd className="min-w-0 text-right font-medium text-foreground">{children}</dd>
  </div>
);

const DetailSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section aria-label={title}>
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <dl>{children}</dl>
  </section>
);

const BuyerSection = ({ order }: { order: LedgerItem["order"] }) => {
  const { user, fullName, phone, address, city } = order;

  return (
    <DetailSection title="Who placed this order">
      <DetailRow label="Account">
        {user.name} (@{user.handle})
      </DetailRow>
      {user.email && <DetailRow label="Email">{user.email}</DetailRow>}
      <DetailRow label="Deliver to">{fullName}</DetailRow>
      <DetailRow label="Phone">{phone}</DetailRow>
      <DetailRow label="Address">
        {address}, {city}
      </DetailRow>
    </DetailSection>
  );
};

const ItemSection = ({ item }: { item: LedgerItem }) => {
  const { product, size, qty, unitPrice, listUnitPrice, brandDiscountAmount, refundedQty } = item;

  return (
    <DetailSection title="What was bought">
      <DetailRow label="Brand">{product.brand.name}</DetailRow>
      <DetailRow label="Size">{size.label}</DetailRow>
      <DetailRow label="Quantity">{qty}</DetailRow>
      <DetailRow label="List price">{money(listUnitPrice)}</DetailRow>
      {brandDiscountAmount > NO_DISCOUNT && (
        <DetailRow label="Brand discount">− {money(brandDiscountAmount)}</DetailRow>
      )}
      <DetailRow label="Price paid each">{money(unitPrice)}</DetailRow>
      {refundedQty > NOTHING_REFUNDED && <DetailRow label="Refunded">{refundedQty}</DetailRow>}
    </DetailSection>
  );
};

const MoneySection = ({ item }: { item: LedgerItem }) => {
  const { brandPayout, commissions } = item;

  return (
    <DetailSection title="Where the money went">
      {brandPayout ? (
        <>
          <DetailRow label="Item value">{money(brandPayout.grossAmount)}</DetailRow>
          <DetailRow label="Platform fee">− {money(brandPayout.platformFee)}</DetailRow>
          <DetailRow label="Gateway fee">− {money(brandPayout.gatewayFee)}</DetailRow>
          <DetailRow label="Brand gets">{money(brandPayout.netAmount)}</DetailRow>
          <DetailRow label="Brand payout">
            {BRAND_PAYOUT_STATUS_LABEL[brandPayout.status]}
          </DetailRow>
          {brandPayout.availableAt && (
            <DetailRow label="Ready from">{formatDate(brandPayout.availableAt)}</DetailRow>
          )}
          {brandPayout.withdrawnAt && (
            <DetailRow label="Paid on">{formatDate(brandPayout.withdrawnAt)}</DetailRow>
          )}
          {brandPayout.voidedReason && (
            <DetailRow label="Why cancelled">{brandPayout.voidedReason}</DetailRow>
          )}
          {brandPayout.needsManualClawback && (
            <DetailRow label="Needs action">Money must be recovered from the brand</DetailRow>
          )}
        </>
      ) : (
        <DetailRow label="Brand payout">Not created yet</DetailRow>
      )}
      {commissions.map(({ id, amount, status, source, creator, recipientBrand, voidedReason }) => (
        <DetailRow key={id} label={toCommissionSourceLabel(source)}>
          {money(amount)} to {creator ? `@${creator.handle}` : recipientBrand?.name} ·{" "}
          {COMMISSION_STATUS_LABEL[status]}
          {voidedReason && <span className="block text-xs font-normal">{voidedReason}</span>}
        </DetailRow>
      ))}
    </DetailSection>
  );
};

const MuseCreditSection = ({ item }: { item: LedgerItem }) => {
  const { attributedCreator, attributionSource } = item;
  if (!attributedCreator) return null;

  return (
    <DetailSection title="Muse credit">
      <DetailRow label="Muse">
        {attributedCreator.name} (@{attributedCreator.handle})
      </DetailRow>
      {attributionSource && (
        <DetailRow label="Sold through">{toCommissionSourceLabel(attributionSource)}</DetailRow>
      )}
    </DetailSection>
  );
};

const OrderSection = ({ order }: { order: LedgerItem["order"] }) => {
  const { createdAt, paymentMethod, paymentStatus, fulfilmentStatus, subtotal } = order;
  const { deliveryFee, total, platformDiscountTotal, brandDiscountTotal } = order;
  const { couponRedemption, _count: orderCounts } = order;
  const otherItemCount = orderCounts.items - SINGLE_ITEM_ORDER;

  return (
    <DetailSection title="The whole order">
      <DetailRow label="Placed">{formatDateTime(createdAt)}</DetailRow>
      <DetailRow label="Delivery status">{toOrderStatusLabel(fulfilmentStatus)}</DetailRow>
      <DetailRow label="Payment status">{toOrderStatusLabel(paymentStatus)}</DetailRow>
      <DetailRow label="Paid by">{PAYMENT_METHOD_LABEL[paymentMethod]}</DetailRow>
      {otherItemCount > NOTHING_REFUNDED && (
        <DetailRow label="Other items">{otherItemCount}</DetailRow>
      )}
      <DetailRow label="Items total">{money(subtotal)}</DetailRow>
      <DetailRow label="Delivery fee">{money(deliveryFee)}</DetailRow>
      {brandDiscountTotal > NO_DISCOUNT && (
        <DetailRow label="Brand discounts">− {money(brandDiscountTotal)}</DetailRow>
      )}
      {platformDiscountTotal > NO_DISCOUNT && (
        <DetailRow label="Platform discounts">− {money(platformDiscountTotal)}</DetailRow>
      )}
      {couponRedemption && (
        <DetailRow label="Coupon">
          {couponRedemption.coupon.code} · − {money(couponRedemption.discountAmount)}
        </DetailRow>
      )}
      <DetailRow label="Order total">{money(total)}</DetailRow>
    </DetailSection>
  );
};

const PaymentHistorySection = ({ order }: { order: LedgerItem["order"] }) => {
  const { transactions, refunds } = order;
  if (transactions.length === 0 && refunds.length === 0) return null;

  return (
    <DetailSection title="Payments and refunds">
      {transactions.map(({ id, provider, type, status, createdAt }) => (
        <DetailRow key={id} label={formatDateTime(createdAt)}>
          {toOrderStatusLabel(type)} · {PAYMENT_METHOD_LABEL[provider]} ·{" "}
          {toOrderStatusLabel(status)}
        </DetailRow>
      ))}
      {refunds.map(({ id, status, reason, totalAmount, createdAt }) => (
        <DetailRow key={id} label={formatDateTime(createdAt)}>
          Refund {money(totalAmount)} · {toOrderStatusLabel(status)}
          <span className="block text-xs font-normal">{reason}</span>
        </DetailRow>
      ))}
    </DetailSection>
  );
};

const LedgerItemStory = ({ item }: { item: LedgerItem }) => (
  <div className="space-y-5">
    <BuyerSection order={item.order} />
    <ItemSection item={item} />
    <MoneySection item={item} />
    <MuseCreditSection item={item} />
    <OrderSection order={item.order} />
    <PaymentHistorySection order={item.order} />
    <Link
      to="/orders/$orderId"
      params={{ orderId: item.order.id }}
      className="inline-block text-sm font-medium text-foreground underline underline-offset-2"
    >
      Open the full order
    </Link>
  </div>
);

export const LedgerItemDrawer = ({
  orderItemId,
  onClose,
}: {
  orderItemId: string;
  onClose: () => void;
}) => {
  const {
    data: item,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["financial-ledger-item", orderItemId],
    queryFn: () => financialRollupApi.getLedgerItem(orderItemId),
  });

  return (
    <Drawer open onClose={onClose} title={item?.product.name ?? "Order item"}>
      <div className="p-5">
        {isLoading && (
          <div className="space-y-2" role="status" aria-label="Loading the item">
            {Array.from({ length: SKELETON_ROW_COUNT }, (_unused, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </div>
        )}
        {isError && <FormBanner>Couldn&apos;t load this item.</FormBanner>}
        {item && <LedgerItemStory item={item} />}
      </div>
    </Drawer>
  );
};
