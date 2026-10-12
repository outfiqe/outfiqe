import { describe, expect, it } from "vitest";

import { isUpdatePromptSuppressed } from "./updatePrompt";

describe("isUpdatePromptSuppressed", () => {
  it.each(["/checkout", "/checkout/address", "/payments/esewa/callback", "/cart"])(
    "stays quiet on %s, where a reload would cost the user money or work",
    (pathname) => {
      expect(isUpdatePromptSuppressed(pathname)).toBe(true);
    },
  );

  it.each(["/", "/explore", "/shop", "/orders", "/cartoons"])(
    "is free to appear on %s",
    (pathname) => {
      expect(isUpdatePromptSuppressed(pathname)).toBe(false);
    },
  );
});
