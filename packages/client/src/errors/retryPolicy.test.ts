import { describe, expect, it } from "vitest";

import { ApiClientError } from "./apiClientError";
import { MAX_QUERY_RETRIES, shouldRetryRequest } from "./retryPolicy";

const apiError = (status?: number) =>
  new ApiClientError("Request failed", "SOME_CODE", undefined, status);

describe("shouldRetryRequest", () => {
  it.each([400, 401, 403, 404, 409, 422])("gives up straight away on a %i", (status) => {
    expect(shouldRetryRequest(0, apiError(status))).toBe(false);
  });

  it.each([408, 429, 500, 502, 503])("retries a %i, which can succeed later", (status) => {
    expect(shouldRetryRequest(0, apiError(status))).toBe(true);
  });

  it("retries network failures that never reached the server", () => {
    expect(shouldRetryRequest(0, apiError(undefined))).toBe(true);
    expect(shouldRetryRequest(0, new TypeError("Failed to fetch"))).toBe(true);
  });

  it("stops after the usual number of attempts", () => {
    expect(shouldRetryRequest(MAX_QUERY_RETRIES - 1, apiError(503))).toBe(true);
    expect(shouldRetryRequest(MAX_QUERY_RETRIES, apiError(503))).toBe(false);
  });
});
