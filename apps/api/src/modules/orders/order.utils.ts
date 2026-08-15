import type { OrderItemView, OrderSummaryView, OrderView } from "./order.types.js";

type OrderItemRow = {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
  product: { name: string; imageUrl: string | null; brand: { name: string } };
  size: { label: string };
  attributedCreator: { name: string } | null;
};

type OrderRow = {
  id: string;
  createdAt: Date;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  landmark: string | null;
  paymentMethod: OrderView["paymentMethod"];
  paymentStatus: OrderView["paymentStatus"];
  fulfilmentStatus: OrderView["fulfilmentStatus"];
  subtotal: number;
  deliveryFee: number;
  codFee: number;
  total: number;
  items: OrderItemRow[];
};

const toOrderItemView = (row: OrderItemRow): OrderItemView => {
  const { id, productId, qty, unitPrice, product, size, attributedCreator } = row;
  const { name: productName, imageUrl, brand } = product;

  return {
    id,
    productId,
    productName,
    brandName: brand.name,
    imageUrl,
    sizeLabel: size.label,
    qty,
    unitPrice,
    attributedCreatorName: attributedCreator?.name ?? null,
  };
};

export const toOrderView = (order: OrderRow): OrderView => {
  const {
    id,
    createdAt,
    fullName,
    phone,
    address,
    city,
    landmark,
    paymentMethod,
    paymentStatus,
    fulfilmentStatus,
    subtotal,
    deliveryFee,
    codFee,
    total,
    items,
  } = order;

  return {
    id,
    createdAt: createdAt.toISOString(),
    fullName,
    phone,
    address,
    city,
    landmark,
    paymentMethod,
    paymentStatus,
    fulfilmentStatus,
    subtotal,
    deliveryFee,
    codFee,
    total,
    items: items.map(toOrderItemView),
  };
};

export const toOrderSummaryView = (order: OrderRow): OrderSummaryView => {
  const { items, ...rest } = toOrderView(order);
  const [firstItem] = items;

  return {
    ...rest,
    itemCount: order.items.length,
    firstItemImageUrl: firstItem?.imageUrl ?? null,
    firstItemProductName: firstItem?.productName ?? "",
  };
};
