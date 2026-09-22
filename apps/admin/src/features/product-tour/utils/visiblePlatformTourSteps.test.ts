import { describe, expect, it } from "vitest";

import { PLATFORM_NAV_ITEMS } from "@/components/AdminSidebar";

import { PLATFORM_DASHBOARD_TOUR_STEPS } from "../constants/platformDashboardTour";
import { visiblePlatformTourSteps } from "./visiblePlatformTourSteps";

const stepIds = (steps: ReturnType<typeof visiblePlatformTourSteps>) =>
  steps.map((step) => step.id);

const ALL_STEP_IDS = stepIds(PLATFORM_DASHBOARD_TOUR_STEPS);

const idsInGroup = (groupKey: string) =>
  PLATFORM_NAV_ITEMS.filter((item) => item.group === groupKey).map((item) => item.id);

describe("visiblePlatformTourSteps", () => {
  it("includes every step for a default platform admin with nothing hidden", () => {
    const steps = visiblePlatformTourSteps(PLATFORM_DASHBOARD_TOUR_STEPS, {
      isCoFounder: false,
      hiddenNavKeys: [],
    });

    expect(stepIds(steps)).toEqual(ALL_STEP_IDS);
  });

  it("drops a group's step once every item in that group is hidden for this viewer", () => {
    const steps = visiblePlatformTourSteps(PLATFORM_DASHBOARD_TOUR_STEPS, {
      isCoFounder: false,
      hiddenNavKeys: idsInGroup("catalog"),
    });

    expect(stepIds(steps)).not.toContain("catalog");
    expect(stepIds(steps)).toContain("commerce");
  });

  it("keeps Platform Settings visible for a non-co-founder even though Navigation access is co-founder-only", () => {
    const steps = visiblePlatformTourSteps(PLATFORM_DASHBOARD_TOUR_STEPS, {
      isCoFounder: false,
      hiddenNavKeys: [],
    });

    expect(stepIds(steps)).toContain("platform-settings");
  });

  it("still includes every group for a co-founder", () => {
    const steps = visiblePlatformTourSteps(PLATFORM_DASHBOARD_TOUR_STEPS, {
      isCoFounder: true,
      hiddenNavKeys: [],
    });

    expect(stepIds(steps)).toEqual(ALL_STEP_IDS);
  });

  it("always keeps the welcome, KPI and finish steps, which have no group", () => {
    const steps = visiblePlatformTourSteps(PLATFORM_DASHBOARD_TOUR_STEPS, {
      isCoFounder: false,
      hiddenNavKeys: PLATFORM_NAV_ITEMS.map((item) => item.id),
    });

    expect(stepIds(steps)).toEqual(["welcome", "kpis", "finish"]);
  });
});
