"use client";

import { useInfiniteCursorPage } from "@outfiqe/shared-hooks";
import { wishlistApi } from "../api/wishlistApi";

export const useInfiniteWishlist = () => {
  return useInfiniteCursorPage(["wishlist"], (cursor) => wishlistApi.list(cursor));
};
