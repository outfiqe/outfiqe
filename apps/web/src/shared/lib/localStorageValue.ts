export const getOrSeedLocalStorageValue = (key: string, seed: () => string): string => {
  if (typeof window === "undefined") return seed();

  const stored = window.localStorage.getItem(key);
  if (stored) return stored;

  const seeded = seed();
  window.localStorage.setItem(key, seeded);
  return seeded;
};

export const setLocalStorageValue = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
};
