import { describe, expect, it } from "vitest";

import { EMAIL_LOGO_DISPLAY_SIZE, EMAIL_LOGO_RENDER_SIZE, emailLogoUrl } from "./index";

describe("email logo", () => {
  it("displays at half the rendered size, so the logo stays sharp on high-density screens", () => {
    expect(EMAIL_LOGO_DISPLAY_SIZE.width * 2).toBe(EMAIL_LOGO_RENDER_SIZE.width);
    expect(EMAIL_LOGO_DISPLAY_SIZE.height * 2).toBe(EMAIL_LOGO_RENDER_SIZE.height);
  });

  it("builds an absolute logo URL on the site origin, with or without a trailing slash", () => {
    expect(emailLogoUrl("https://outfiqe.com")).toBe("https://outfiqe.com/email/logo.png");
    expect(emailLogoUrl("https://outfiqe.com/")).toBe("https://outfiqe.com/email/logo.png");
  });
});
