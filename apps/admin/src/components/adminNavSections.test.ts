import { describe, expect, it } from "vitest";

import { buildAdminNavSections } from "./adminNavSections";

describe("buildAdminNavSections", () => {
  it("shows no sections for a viewer with no platform access and no CRM organization", () => {
    expect(buildAdminNavSections(null, undefined)).toEqual([]);
  });
});
