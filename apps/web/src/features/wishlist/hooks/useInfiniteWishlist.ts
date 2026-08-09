"use client";

import { useInfiniteCursorPage } from "@/shared/hooks/useInfiniteCursorPage";
import { wishlistApi } from "../api/wishlistApi";

export const useInfiniteWishlist = () => {
  return useInfiniteCursorPage(["wishlist"], (cursor) => wishlistApi.list(cursor));
};
