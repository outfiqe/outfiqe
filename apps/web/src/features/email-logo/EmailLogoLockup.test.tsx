import {
  lightThemeBrandHex,
  LOGO_MARK_PATHS,
  LOGO_TONE_TOKEN,
  LOGO_WORDMARK_SEGMENTS,
  LOGO_WORDMARK_TEXT,
} from "@outfiqe/design-system";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmailLogoLockup } from "./EmailLogoLockup";

describe("EmailLogoLockup", () => {
  it("draws every shared logo-mark path in its light-theme brand colour", () => {
    const { container } = render(<EmailLogoLockup />);
    const paths = [...container.querySelectorAll("path")];

    expect(paths.map((path) => path.getAttribute("d"))).toEqual(LOGO_MARK_PATHS.map(({ d }) => d));
    expect(paths.map((path) => path.getAttribute("fill"))).toEqual(
      LOGO_MARK_PATHS.map(({ tone }) => lightThemeBrandHex(LOGO_TONE_TOKEN[tone])),
    );
  });

  it("spells the shared wordmark with each segment in its brand colour", () => {
    const { container } = render(<EmailLogoLockup />);

    expect(container).toHaveTextContent(LOGO_WORDMARK_TEXT);
    for (const { text, tone } of LOGO_WORDMARK_SEGMENTS) {
      expect(screen.getByText(text)).toHaveStyle({
        color: lightThemeBrandHex(LOGO_TONE_TOKEN[tone]),
      });
    }
  });
});
