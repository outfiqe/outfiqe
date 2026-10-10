"use client";

import { useEffect } from "react";

import { registerBackgroundRefresh } from "../utils/backgroundRefresh";

export const BackgroundRefreshRegistration = () => {
  useEffect(() => {
    void registerBackgroundRefresh();
  }, []);

  return null;
};
