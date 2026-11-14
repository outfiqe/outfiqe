import { beforeEach, describe, expect, it } from "vitest";

import {
  carryOverLegacyForYouHintDismissal,
  FOR_YOU_HINT_DISMISSED_COOKIE_NAME,
  FOR_YOU_HINT_DISMISSED_VALUE,
  isForYouHintDismissed,
  isForYouHintDismissedCookieValue,
  LEGACY_FOR_YOU_HINT_DISMISSED_STORAGE_KEY,
  rememberForYouHintDismissed,
} from "./forYouHint";

const EXPIRED_COOKIE_ATTRIBUTES = "Path=/; Max-Age=0";

const clearDismissedCookie = () => {
  document.cookie = `${FOR_YOU_HINT_DISMISSED_COOKIE_NAME}=; ${EXPIRED_COOKIE_ATTRIBUTES}`;
};

beforeEach(() => {
  window.localStorage.clear();
  clearDismissedCookie();
});

describe("isForYouHintDismissed / rememberForYouHintDismissed", () => {
  it("is not dismissed for a fresh visitor", () => {
    expect(isForYouHintDismissed()).toBe(false);
  });

  it("stays dismissed once remembered, in a cookie the server can read", () => {
    rememberForYouHintDismissed();

    expect(isForYouHintDismissed()).toBe(true);
    expect(document.cookie).toContain(
      `${FOR_YOU_HINT_DISMISSED_COOKIE_NAME}=${FOR_YOU_HINT_DISMISSED_VALUE}`,
    );
  });

  it("still honours a dismissal saved in browser storage by an older version", () => {
    window.localStorage.setItem(
      LEGACY_FOR_YOU_HINT_DISMISSED_STORAGE_KEY,
      FOR_YOU_HINT_DISMISSED_VALUE,
    );

    expect(isForYouHintDismissed()).toBe(true);
  });
});

describe("carryOverLegacyForYouHintDismissal", () => {
  it("moves an older browser-storage dismissal into the cookie", () => {
    window.localStorage.setItem(
      LEGACY_FOR_YOU_HINT_DISMISSED_STORAGE_KEY,
      FOR_YOU_HINT_DISMISSED_VALUE,
    );

    carryOverLegacyForYouHintDismissal();

    expect(document.cookie).toContain(
      `${FOR_YOU_HINT_DISMISSED_COOKIE_NAME}=${FOR_YOU_HINT_DISMISSED_VALUE}`,
    );
    expect(window.localStorage.getItem(LEGACY_FOR_YOU_HINT_DISMISSED_STORAGE_KEY)).toBeNull();
  });

  it("sets nothing for a visitor who never dismissed the hint", () => {
    carryOverLegacyForYouHintDismissal();

    expect(isForYouHintDismissed()).toBe(false);
  });
});

describe("isForYouHintDismissedCookieValue", () => {
  it("reads only the dismissed value as dismissed", () => {
    expect(isForYouHintDismissedCookieValue(FOR_YOU_HINT_DISMISSED_VALUE)).toBe(true);
    expect(isForYouHintDismissedCookieValue(undefined)).toBe(false);
    expect(isForYouHintDismissedCookieValue("0")).toBe(false);
  });
});
