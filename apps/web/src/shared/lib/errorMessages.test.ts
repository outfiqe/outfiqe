import { describe, expect, it } from "vitest";

import { ApiClientError } from "@/shared/lib/apiClient";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { HeicConversionError } from "@/shared/lib/heicImage";

describe("getErrorMessage", () => {
  it("surfaces a HEIC conversion failure with its own guidance", () => {
    expect(getErrorMessage(new HeicConversionError(new Error("libheif")))).toMatch(/JPEG or PNG/);
  });

  it("maps a known API error code to a generic message", () => {
    expect(getErrorMessage(new ApiClientError("raw detail", "RATE_LIMITED"))).toBe(
      "Too many attempts. Please wait a moment and try again.",
    );
  });

  it("prefers the backend message for feature-specific API errors", () => {
    expect(
      getErrorMessage(new ApiClientError("That size just sold out", "PRODUCT_OUT_OF_STOCK")),
    ).toBe("That size just sold out");
  });

  it("falls back to a safe generic message for unknown errors", () => {
    expect(getErrorMessage(new Error("stack trace leak"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
