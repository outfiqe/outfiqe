"use client";

import { productDetailApi } from "../api/productDetailApi";

export const useRecordSeenOnClick = () => {
  return (lookId: string, productId: string) => {
    void productDetailApi.recordSeenOnClick(lookId, productId);
  };
};
