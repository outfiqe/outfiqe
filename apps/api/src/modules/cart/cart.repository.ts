import { prisma } from "#db/prisma.js";

export const cartRepository = {
  async getOrCreateCartId(userId: string): Promise<string> {
    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { id: true },
    });
    return cart.id;
  },

  async findItemById(cartId: string, cartItemId: string) {
    return prisma.cartItem.findFirst({ where: { id: cartItemId, cartId } });
  },

  async findItemBySizeId(cartId: string, sizeId: string) {
    return prisma.cartItem.findUnique({ where: { cartId_sizeId: { cartId, sizeId } } });
  },

  async upsertItem(cartId: string, productId: string, sizeId: string, qty: number) {
    return prisma.cartItem.upsert({
      where: { cartId_sizeId: { cartId, sizeId } },
      update: { qty },
      create: { cartId, productId, sizeId, qty },
    });
  },

  async updateItemQty(cartId: string, cartItemId: string, qty: number): Promise<boolean> {
    const result = await prisma.cartItem.updateMany({
      where: { id: cartItemId, cartId },
      data: { qty },
    });
    return result.count > 0;
  },

  async removeItem(cartId: string, cartItemId: string): Promise<boolean> {
    const result = await prisma.cartItem.deleteMany({ where: { id: cartItemId, cartId } });
    return result.count > 0;
  },

  async clearCart(cartId: string): Promise<void> {
    await prisma.cartItem.deleteMany({ where: { cartId } });
  },

  async listItems(cartId: string) {
    return prisma.cartItem.findMany({
      where: { cartId },
      orderBy: { createdAt: "asc" },
      include: {
        product: {
          select: { name: true, price: true, imageUrl: true, brand: { select: { name: true } } },
        },
        size: { select: { label: true } },
      },
    });
  },
};
