import { afterEach, describe, expect, it, vi } from "vitest";

import { announceLocaleChange, readLocaleCookie, subscribeToLocaleChanges } from "./localeCookie";
import { LOCALE_COOKIE_NAME } from "./locales";

const setLocaleCookie = (value: string) => {
  document.cookie = `${LOCALE_COOKIE_NAME}=${value}; path=/`;
};

afterEach(() => {
  document.cookie = `${LOCALE_COOKIE_NAME}=; path=/; max-age=0`;
});

describe("readLocaleCookie", () => {
  it("reads a supported language from the cookie", () => {
    setLocaleCookie("ne");

    expect(readLocaleCookie()).toBe("ne");
  });

  it("falls back to English when there is no cookie or it holds something unknown", () => {
    expect(readLocaleCookie()).toBe("en");

    setLocaleCookie("fr");

    expect(readLocaleCookie()).toBe("en");
  });
});

describe("subscribeToLocaleChanges", () => {
  it("tells every listener about a change until it unsubscribes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToLocaleChanges(listener);

    announceLocaleChange();
    unsubscribe();
    announceLocaleChange();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
