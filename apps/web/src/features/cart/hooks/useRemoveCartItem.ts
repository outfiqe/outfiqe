"use client";

import { toast } from "@outfiqe/design-system";
import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trackEvent } from "@/features/analytics/utils/analyticsClient";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { cartApi } from "../api/cartApi";
import type { Cart } from "../api/cartSchemas";
import { CART_QUERY_KEY } from "../constants/cart.constants";

export const useRemoveCartItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cartItemId: string) => cartApi.removeItem(cartItemId),
    onSuccess: (cart, cartItemId) => {
      const cartBeforeRemoval = queryClient.getQueryData<Cart>(CART_QUERY_KEY);
      const removedItem = cartBeforeRemoval?.items.find((cartItem) => cartItem.id === cartItemId);
      queryClient.setQueryData(CART_QUERY_KEY, cart);
      trackEvent(ANALYTICS_EVENTS.CART_ITEM_REMOVE, {
        product_id: removedItem?.productId ?? null,
        cart_item_count: cart.itemCount,
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
