import type { NextRequest } from "next/server";

import { REFRESH_COOKIE_NAME } from "@/features/auth/constants/sessionCookies";
import { TASTE_CATEGORIES_COOKIE_NAME } from "@/features/categories/utils/tasteSlugs";

import { HOME_PATH } from "../constants/guestHome";

const PERSONALISING_COOKIE_NAMES = [REFRESH_COOKIE_NAME, TASTE_CATEGORIES_COOKIE_NAME];

const CACHEABLE_METHODS = new Set(["GET", "HEAD"]);

type HomeRequest = Pick<NextRequest, "method" | "nextUrl" | "cookies">;

const carriesPersonalisingCookie = (cookies: HomeRequest["cookies"]): boolean =>
  PERSONALISING_COOKIE_NAMES.some((cookieName) => cookies.has(cookieName));

export const shouldServeGuestHome = ({ method, nextUrl, cookies }: HomeRequest): boolean =>
  CACHEABLE_METHODS.has(method) &&
  nextUrl.pathname === HOME_PATH &&
  nextUrl.search === "" &&
  !carriesPersonalisingCookie(cookies);
