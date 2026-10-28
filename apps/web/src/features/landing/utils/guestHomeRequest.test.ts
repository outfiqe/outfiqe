import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { REFRESH_COOKIE_NAME } from "@/features/auth/constants/sessionCookies";
import { TASTE_CATEGORIES_COOKIE_NAME } from "@/features/categories/utils/tasteSlugs";
import { LOCALE_COOKIE_NAME } from "@/i18n/locales";

import { shouldServeGuestHome } from "./guestHomeRequest";

const SITE_ORIGIN = "https://outfiqe.com";

const buildRequest = (
  path: string,
  { method = "GET", cookie }: { method?: string; cookie?: string } = {},
) =>
  new NextRequest(`${SITE_ORIGIN}${path}`, {
    method,
    headers: cookie ? { cookie } : {},
  });

describe("shouldServeGuestHome", () => {
  it("serves the cached home to a cookieless GET of /", () => {
    expect(shouldServeGuestHome(buildRequest("/"))).toBe(true);
  });

  it("serves the cached home to a HEAD of /", () => {
    expect(shouldServeGuestHome(buildRequest("/", { method: "HEAD" }))).toBe(true);
  });

  it("still serves the cached home when only the language cookie is set", () => {
    const request = buildRequest("/", { cookie: `${LOCALE_COOKIE_NAME}=ne` });
    expect(shouldServeGuestHome(request)).toBe(true);
  });

  it("renders live for a visitor with a session cookie", () => {
    const request = buildRequest("/", { cookie: `${REFRESH_COOKIE_NAME}=session-token` });
    expect(shouldServeGuestHome(request)).toBe(false);
  });

  it("renders live for a visitor who picked a taste", () => {
    const request = buildRequest("/", {
      cookie: `${TASTE_CATEGORIES_COOKIE_NAME}=${encodeURIComponent('["dresses"]')}`,
    });
    expect(shouldServeGuestHome(request)).toBe(false);
  });

  it("renders live for a deep link carrying a category or type", () => {
    expect(shouldServeGuestHome(buildRequest("/?category=dresses"))).toBe(false);
    expect(shouldServeGuestHome(buildRequest("/?type=all"))).toBe(false);
  });

  it("leaves every other path alone", () => {
    expect(shouldServeGuestHome(buildRequest("/shop"))).toBe(false);
    expect(shouldServeGuestHome(buildRequest("/guest-home"))).toBe(false);
  });

  it("never caches a POST to /", () => {
    expect(shouldServeGuestHome(buildRequest("/", { method: "POST" }))).toBe(false);
  });
});
