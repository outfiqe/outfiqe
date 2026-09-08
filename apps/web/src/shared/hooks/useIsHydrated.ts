"use client";

import { useSyncExternalStore } from "react";

const subscribe = (): (() => void) => () => {};
const getHydratedSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

export const useIsHydrated = (): boolean =>
  useSyncExternalStore(subscribe, getHydratedSnapshot, getServerSnapshot);
