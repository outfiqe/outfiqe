import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { readLocaleCookie } from "./localeCookie";
import { LOCALE_COOKIE_NAME } from "./locales";
import { useActiveLocale, useChosenLanguage } from "./useChosenLanguage";

afterEach(() => {
  document.cookie = `${LOCALE_COOKIE_NAME}=; path=/; max-age=0`;
});

describe("useChosenLanguage", () => {
  it("switches the language straight away and saves it in the browser", () => {
    const { result } = renderHook(() => useChosenLanguage());
    expect(result.current.chosenLocale).toBe("en");

    act(() => result.current.chooseLanguage("ne"));

    expect(result.current.chosenLocale).toBe("ne");
    expect(readLocaleCookie()).toBe("ne");
  });
});

describe("useActiveLocale", () => {
  it("follows the language chosen in the browser", () => {
    const { result } = renderHook(() => useActiveLocale("en"));
    const { result: chooser } = renderHook(() => useChosenLanguage());

    act(() => chooser.current.chooseLanguage("ne"));

    expect(result.current).toBe("ne");
  });
});
