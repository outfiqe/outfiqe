import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError } from "../errors";
import { createApiClient } from "./index";

const FORBIDDEN_STATUS = 403;
const RATE_LIMITED_STATUS = 429;
const SERVICE_UNAVAILABLE_STATUS = 503;
const UNAUTHORIZED_STATUS = 401;

const rejectAsUnauthorized = async (config: InternalAxiosRequestConfig) => {
  throw new AxiosError("Unauthorized", undefined, config, undefined, {
    status: UNAUTHORIZED_STATUS,
    statusText: "Unauthorized",
    data: { message: "Expired", code: "TOKEN_EXPIRED" },
    headers: {},
    config,
  });
};

const failRefreshWithStatus = (status: number) =>
  vi.spyOn(axios, "post").mockRejectedValue(
    new AxiosError("Refresh failed", undefined, undefined, undefined, {
      status,
      statusText: "Refresh failed",
      data: {},
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    }),
  );

const requestWithExpiredToken = async () => {
  const client = createApiClient({ baseURL: "/api" });
  const signOutShopper = vi.fn();
  client.setUnauthorizedHandler(signOutShopper);

  await expect(client.get("/orders", { adapter: rejectAsUnauthorized })).rejects.toBeInstanceOf(
    ApiClientError,
  );

  return signOutShopper;
};

describe("a failed session refresh", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([UNAUTHORIZED_STATUS, FORBIDDEN_STATUS])(
    "signs the shopper out when the server rejects the session with %i",
    async (status) => {
      failRefreshWithStatus(status);

      expect(await requestWithExpiredToken()).toHaveBeenCalledOnce();
    },
  );

  it.each([RATE_LIMITED_STATUS, SERVICE_UNAVAILABLE_STATUS])(
    "keeps the shopper signed in after a temporary %i",
    async (status) => {
      failRefreshWithStatus(status);

      expect(await requestWithExpiredToken()).not.toHaveBeenCalled();
    },
  );

  it("keeps the shopper signed in when the connection drops", async () => {
    vi.spyOn(axios, "post").mockRejectedValue(new AxiosError("Network Error"));

    expect(await requestWithExpiredToken()).not.toHaveBeenCalled();
  });
});
