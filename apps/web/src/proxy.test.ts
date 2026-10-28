import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { REFRESH_COOKIE_NAME } from "@/features/auth/constants/sessionCookies";
import { GUEST_HOME_PATH } from "@/features/landing/constants/guestHome";

import { proxy } from "./proxy";

const SITE_ORIGIN = "https://outfiqe.com";
const REWRITE_HEADER = "x-middleware-rewrite";
const CONTENT_SECURITY_POLICY_HEADER = "Content-Security-Policy";
const NONCE_SOURCE = "'nonce-";
const STATIC_SCRIPT_SOURCE = "script-src 'self' 'unsafe-inline'";

const visit = (path: string, cookie?: string) =>
  proxy(new NextRequest(`${SITE_ORIGIN}${path}`, { headers: cookie ? { cookie } : {} }));

describe("proxy", () => {
  it("rewrites a cookieless visit to / onto the cached guest home with the static policy", () => {
    const response = visit("/");

    expect(response.headers.get(REWRITE_HEADER)).toBe(`${SITE_ORIGIN}${GUEST_HOME_PATH}`);
    const contentSecurityPolicy = response.headers.get(CONTENT_SECURITY_POLICY_HEADER);
    expect(contentSecurityPolicy).toContain(STATIC_SCRIPT_SOURCE);
    expect(contentSecurityPolicy).not.toContain(NONCE_SOURCE);
  });

  it("keeps a signed-in visit to / on the live render with a nonce policy", () => {
    const response = visit("/", `${REFRESH_COOKIE_NAME}=session-token`);

    expect(response.headers.get(REWRITE_HEADER)).toBeNull();
    expect(response.headers.get(CONTENT_SECURITY_POLICY_HEADER)).toContain(NONCE_SOURCE);
  });

  it("keeps a deep link into the taste picker on the live render", () => {
    const response = visit("/?category=dresses");

    expect(response.headers.get(REWRITE_HEADER)).toBeNull();
    expect(response.headers.get(CONTENT_SECURITY_POLICY_HEADER)).toContain(NONCE_SOURCE);
  });

  it("passes other pages through without a rewrite", () => {
    const dynamicPage = visit("/shop");
    const staticPage = visit("/about");

    expect(dynamicPage.headers.get(REWRITE_HEADER)).toBeNull();
    expect(dynamicPage.headers.get(CONTENT_SECURITY_POLICY_HEADER)).toContain(NONCE_SOURCE);
    expect(staticPage.headers.get(REWRITE_HEADER)).toBeNull();
    expect(staticPage.headers.get(CONTENT_SECURITY_POLICY_HEADER)).toContain(STATIC_SCRIPT_SOURCE);
  });
});
