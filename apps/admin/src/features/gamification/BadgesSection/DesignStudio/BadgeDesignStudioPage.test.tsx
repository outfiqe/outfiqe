import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BadgeAdmin } from "../../schemas";
import { EMPTY_FORM } from "../badgeForm.constants";
import { BadgeDesignStudioPage } from "./BadgeDesignStudioPage";
import type { BadgeStudioDraft } from "./badgeStudioDraft.types";
import { readBadgeStudioDraft, writeBadgeStudioDraft } from "./badgeStudioDraft.utils";

vi.mock("./DesignStudio", () => ({
  DesignStudio: (props: {
    icon: string;
    rarity: string;
    initialLayers: unknown[];
    initialAnimation: string;
    onDone: (layers: unknown[], animation: string) => void;
    onCancel: () => void;
  }) => (
    <div>
      <p>studio-icon:{props.icon}</p>
      <p>studio-rarity:{props.rarity}</p>
      <p>studio-layer-count:{props.initialLayers.length}</p>
      <button onClick={props.onCancel}>mock-cancel</button>
      <button onClick={() => props.onDone([{ id: "layer-1" }], "pulse")}>mock-done</button>
    </div>
  ),
}));

const badgeFixture: BadgeAdmin = {
  id: "badge-1",
  name: "Fashion Warrior",
  description: "Wore ten looks",
  category: "SPECIAL",
  rarity: "LEGENDARY",
  icon: "❤",
  designConfig: { shape: "circle", primaryColor: "#94a3b8" },
  xpReward: 0,
  isPermanent: true,
  isDynamic: false,
  isPublic: true,
  isActive: true,
  assignmentLimit: 5,
  assignmentCount: 0,
  isTitleEligible: false,
  sponsorBrand: null,
  achievement: null,
};

const renderDesignStudioPage = (draft: BadgeStudioDraft | undefined) => {
  if (draft) writeBadgeStudioDraft(draft);

  const rootRoute = createRootRoute();
  const badgesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/gamification/badges",
    component: () => <div>badges-list</div>,
  });
  const designStudioRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/gamification/badges/design-studio",
    component: BadgeDesignStudioPage,
  });
  const routeTree = rootRoute.addChildren([badgesRoute, designStudioRoute]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/gamification/badges/design-studio"] }),
  });
  render(<RouterProvider router={router} />);
};

describe("BadgeDesignStudioPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("redirects back to the badges list when there is no draft to design", async () => {
    renderDesignStudioPage(undefined);
    expect(await screen.findByText("badges-list")).toBeInTheDocument();
  });

  it("renders the studio with the draft's icon, rarity, and layers for a create session", async () => {
    const form = { ...EMPTY_FORM, name: "Trailblazer", icon: "🌟", rarity: "RARE" as const };
    renderDesignStudioPage({ mode: "create", form });

    expect(await screen.findByText("studio-icon:🌟")).toBeInTheDocument();
    expect(screen.getByText("studio-rarity:RARE")).toBeInTheDocument();
    expect(screen.getByText("studio-layer-count:0")).toBeInTheDocument();
  });

  it("falls back to the trophy emoji when the draft has no icon yet", async () => {
    renderDesignStudioPage({ mode: "create", form: { ...EMPTY_FORM, icon: "" } });
    expect(await screen.findByText("studio-icon:🏆")).toBeInTheDocument();
  });

  it("resumes the badges list with the untouched form when the studio is cancelled", async () => {
    const form = { ...EMPTY_FORM, name: "Trailblazer" };
    renderDesignStudioPage({ mode: "create", form });

    await userEvent.click(await screen.findByText("mock-cancel"));

    expect(await screen.findByText("badges-list")).toBeInTheDocument();
    const resumedDraft = readBadgeStudioDraft();
    expect(resumedDraft).toEqual({ mode: "create", form });
  });

  it("resumes the badges list with the edited layers and animation when the studio is done", async () => {
    const form = { ...EMPTY_FORM, name: "Trailblazer" };
    renderDesignStudioPage({ mode: "create", form });

    await userEvent.click(await screen.findByText("mock-done"));

    expect(await screen.findByText("badges-list")).toBeInTheDocument();
    const resumedDraft = readBadgeStudioDraft();
    expect(resumedDraft).toEqual({
      mode: "create",
      form: {
        ...form,
        designMode: "studio",
        studioLayers: [{ id: "layer-1" }],
        animation: "pulse",
      },
    });
  });

  it("carries the badge and edit-only fields through an edit session round trip", async () => {
    renderDesignStudioPage({
      mode: "edit",
      badge: badgeFixture,
      form: { ...EMPTY_FORM, name: "Fashion Warrior" },
      isActive: false,
      achievementIsActive: true,
    });

    await userEvent.click(await screen.findByText("mock-done"));

    const resumedDraft = readBadgeStudioDraft();
    if (resumedDraft?.mode !== "edit") throw new Error("expected an edit draft");
    expect(resumedDraft.badge.id).toBe("badge-1");
    expect(resumedDraft.isActive).toBe(false);
    expect(resumedDraft.achievementIsActive).toBe(true);
  });
});
