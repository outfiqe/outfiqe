import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { appleSplashScreens } from "../constants/appleSplashScreens";
import { AppleSplashLinks } from "./AppleSplashLinks";

const splashLinkSelector = 'link[rel="apple-touch-startup-image"]';

describe("AppleSplashLinks", () => {
  it("emits one startup image per supported device", () => {
    render(<AppleSplashLinks />);

    expect(document.querySelectorAll(splashLinkSelector)).toHaveLength(appleSplashScreens.length);
  });

  it("pairs every image with the media query that selects it", () => {
    render(<AppleSplashLinks />);

    const splashLinks = Array.from(document.querySelectorAll(splashLinkSelector));

    splashLinks.forEach((splashLink) => {
      expect(splashLink.getAttribute("href")).toMatch(/^\/splash\/splash-\d+x\d+@\dx\.png$/);
      expect(splashLink.getAttribute("media")).toContain("orientation: portrait");
    });
  });
});
