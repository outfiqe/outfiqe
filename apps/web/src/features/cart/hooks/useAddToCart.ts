"use client";

import { toast } from "@outfiqe/design-system";
import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trackEvent } from "@/features/analytics/utils/analyticsClient";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { cartApi } from "../api/cartApi";
import { CART_QUERY_KEY } from "../constants/cart.constants";

const DEFAULT_ADDED_QUANTITY = 1;

export const useAddToCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, sizeId, qty }: { productId: string; sizeId: string; qty?: number }) =>
      cartApi.addItem(productId, sizeId, qty),
    onSuccess: (cart, { productId, qty }) => {
      queryClient.setQueryData(CART_QUERY_KEY, cart);
      const addedItem = cart.items.find((cartItem) => cartItem.productId === productId);
      trackEvent(ANALYTICS_EVENTS.CART_ITEM_ADD, {
        product_id: productId,
        item_quantity: qty ?? DEFAULT_ADDED_QUANTITY,
        product_price_npr: addedItem?.unitPrice ?? null,
        cart_item_count: cart.itemCount,
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
