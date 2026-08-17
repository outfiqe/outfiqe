"use client";

import { useEffect, useReducer } from "react";

import { type BuyNowPayload, readBuyNowPayload } from "../lib/buyNowStorage";

type BuyNowPayloadState = { isResolved: boolean; payload: BuyNowPayload | null };

const initialState: BuyNowPayloadState = { isResolved: false, payload: null };

const resolve = (payload: BuyNowPayload | null): BuyNowPayloadState => ({
  isResolved: true,
  payload,
});

export const useBuyNowPayload = (enabled: boolean) => {
  const [state, dispatch] = useReducer(
    (_state: BuyNowPayloadState, payload: BuyNowPayload | null) => resolve(payload),
    initialState,
  );

  useEffect(() => {
    dispatch(enabled ? readBuyNowPayload() : null);
  }, [enabled]);

  return state;
};
