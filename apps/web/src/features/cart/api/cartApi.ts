import { apiClient } from "@/shared/lib/apiClient";

import { type Cart, cartSchema } from "./cartSchemas";

export const cartApi = {
  async get(): Promise<Cart> {
    const res = await apiClient.get<Cart>("/cart");
    return cartSchema.parse(res.data);
  },

  async addItem(productId: string, sizeId: string, qty = 1): Promise<Cart> {
    const res = await apiClient.post<Cart>("/cart/items", { productId, sizeId, qty });
    return cartSchema.parse(res.data);
  },

  async updateItem(cartItemId: string, qty: number): Promise<Cart> {
    const res = await apiClient.patch<Cart>(`/cart/items/${cartItemId}`, { qty });
    return cartSchema.parse(res.data);
  },

  async removeItem(cartItemId: string): Promise<Cart> {
    const res = await apiClient.del<Cart>(`/cart/items/${cartItemId}`);
    return cartSchema.parse(res.data);
  },

  async updateCity(city: string): Promise<Cart> {
    const res = await apiClient.patch<Cart>("/cart/city", { city });
    return cartSchema.parse(res.data);
  },

  async applyCoupon(code: string): Promise<Cart> {
    const res = await apiClient.post<Cart>("/cart/coupon", { code });
    return cartSchema.parse(res.data);
  },

  async removeCoupon(): Promise<Cart> {
    const res = await apiClient.del<Cart>("/cart/coupon");
    return cartSchema.parse(res.data);
  },
};
