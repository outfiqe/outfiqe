export type CartItemView = {
  id: string;
  productId: string;
  sizeId: string;
  productName: string;
  brandName: string;
  imageUrl: string | null;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
  availableStock: number;
  soldOut: boolean;
  lowStock: boolean;
};

export type CartView = {
  items: CartItemView[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
};
