import { getOrSeedLocalStorageValue, setLocalStorageValue } from "./localStorageValue";

export const getOrSeedLastSeenAt = (key: string): string =>
  getOrSeedLocalStorageValue(key, () => new Date().toISOString());

export const markSeenNow = (key: string): void =>
  setLocalStorageValue(key, new Date().toISOString());
