import { describe, expect, it } from "vitest";

import { CRM_DASHBOARD_TOUR_STEPS } from "../constants/crmDashboardTour";
import { visibleCrmTourSteps } from "./visibleCrmTourSteps";

const stepIds = (steps: ReturnType<typeof visibleCrmTourSteps>) => steps.map((step) => step.id);

describe("visibleCrmTourSteps", () => {
  it("includes every step for a super admin whose organization has a linked brand", () => {
    const steps = visibleCrmTourSteps(CRM_DASHBOARD_TOUR_STEPS, {
      viewerIsSuperAdmin: true,
      viewerPermissionKeys: [],
      linkedBrandId: "brand-1",
    });

    expect(stepIds(steps)).toEqual(stepIds(CRM_DASHBOARD_TOUR_STEPS));
  });

  it("hides the brand-scoped steps for a super admin too when the organization has no linked brand", () => {
    const steps = visibleCrmTourSteps(CRM_DASHBOARD_TOUR_STEPS, {
      viewerIsSuperAdmin: true,
      viewerPermissionKeys: [],
      linkedBrandId: null,
    });

    expect(stepIds(steps)).toEqual([
      "welcome",
      "search",
      "contacts",
      "pipeline",
      "tasks",
      "support",
      "reports",
      "roles",
      "audit",
      "finish",
    ]);
  });

  it("keeps the permission-free steps for a role with no CRM permissions at all", () => {
    const steps = visibleCrmTourSteps(CRM_DASHBOARD_TOUR_STEPS, {
      viewerIsSuperAdmin: false,
      viewerPermissionKeys: [],
      linkedBrandId: "brand-1",
    });

    expect(stepIds(steps)).toEqual(["welcome", "search", "finish"]);
  });

  it("adds a step once the viewer holds its permission key", () => {
    const steps = visibleCrmTourSteps(CRM_DASHBOARD_TOUR_STEPS, {
      viewerIsSuperAdmin: false,
      viewerPermissionKeys: ["pipeline:read", "tickets:read"],
      linkedBrandId: "brand-1",
    });

    expect(stepIds(steps)).toEqual(["welcome", "search", "pipeline", "support", "finish"]);
  });

  it("hides a brand-scoped step when the organization has no linked brand, even with the permission", () => {
    const steps = visibleCrmTourSteps(CRM_DASHBOARD_TOUR_STEPS, {
      viewerIsSuperAdmin: false,
      viewerPermissionKeys: ["accounts:read", "billing:read"],
      linkedBrandId: null,
    });

    expect(stepIds(steps)).toEqual(["welcome", "search", "finish"]);
  });

  it("shows a brand-scoped step once both the permission and a linked brand are present", () => {
    const steps = visibleCrmTourSteps(CRM_DASHBOARD_TOUR_STEPS, {
      viewerIsSuperAdmin: false,
      viewerPermissionKeys: ["accounts:read"],
      linkedBrandId: "brand-1",
    });

    expect(stepIds(steps)).toEqual(["welcome", "search", "partners", "finish"]);
  });
});
