import { describe, expect, it } from "vitest";

import { appScreenshots } from "../constants/appScreenshots";
import { buildManifestScreenshots } from "./manifestScreenshots";

describe("buildManifestScreenshots", () => {
  it("lists nothing when no screenshot files are present", () => {
    expect(buildManifestScreenshots([])).toEqual([]);
  });

  it("maps a screenshot to a manifest entry carrying its form factor and label", () => {
    const [firstScreenshot] = appScreenshots;

    expect(buildManifestScreenshots([firstScreenshot!])).toEqual([
      {
        src: `/screenshots/${firstScreenshot!.fileName}`,
        sizes: firstScreenshot!.size,
        type: "image/png",
        form_factor: firstScreenshot!.formFactor,
        label: firstScreenshot!.label,
      },
    ]);
  });

  it("keeps both a narrow and a wide entry when given the full set", () => {
    const formFactors = buildManifestScreenshots(appScreenshots).map((entry) => entry.form_factor);

    expect(formFactors).toContain("narrow");
    expect(formFactors).toContain("wide");
  });
});
