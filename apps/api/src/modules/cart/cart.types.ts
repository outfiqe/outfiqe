export type CartItemView = {
  id: string;
  productId: string;
  sizeId: string;
  productName: string;
  brandName: string;
  imageUrl: string | null;
  sizeLabel: string;
  unitPrice: number;
  listUnitPrice: number;
  discountPercent: number | null;
  qty: number;
  availableStock: number;
  soldOut: boolean;
  lowStock: boolean;
};

export type AppliedCouponView = {
  code: string;
  discountAmount: number;
  prepaidOnly: boolean;
};

export type CartView = {
  items: CartItemView[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  platformDiscountTotal: number;
  total: number;
  city: string | null;
  appliedCoupon: AppliedCouponView | null;
};
