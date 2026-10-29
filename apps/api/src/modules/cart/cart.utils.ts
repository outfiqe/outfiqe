import { ProductStatus } from "#generated/prisma/enums.js";

type CartRowSellability = {
  productId: string;
  size: { productId: string };
  product: { status: ProductStatus; deletedAt: Date | null };
};

export const isCartRowSellable = ({ productId, size, product }: CartRowSellability): boolean =>
  size.productId === productId &&
  product.status === ProductStatus.APPROVED &&
  product.deletedAt === null;
