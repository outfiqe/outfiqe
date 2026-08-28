import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { BadgeAdmin } from "../schemas";
import { BadgeFormPage } from "./BadgeFormPage";

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}`;

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
  assignmentLimit: null,
  assignmentCount: 0,
  isTitleEligible: false,
  sponsorBrand: null,
  achievement: {
    id: "ach-1",
    requirementType: "ENGAGEMENT",
    requirementConfig: { conditions: [{ metric: "total_likes", operator: "gte", value: 5 }] },
    isActive: true,
    activeFrom: null,
    activeUntil: null,
  },
};

const renderFormPage = (element: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const listRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/gamification/badges",
    component: () => <div>badges-list</div>,
  });
  const formRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/gamification/badges/form",
    component: () => <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>,
  });
  const editRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/gamification/badges/$badgeId/edit",
    component: () => <div>edit-route</div>,
  });
  const newRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/gamification/badges/new",
    component: () => <div>new-route</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([listRoute, formRoute, editRoute, newRoute]),
    history: createMemoryHistory({ initialEntries: ["/gamification/badges/form"] }),
  });
  render(<RouterProvider router={router} />);
};

describe("BadgeFormPage", () => {
  it("renders the create form with Details and Design tabs", async () => {
    renderFormPage(<BadgeFormPage mode="create" />);

    expect(await screen.findByRole("heading", { name: "New badge" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Design" })).toBeInTheDocument();
  });

  it("switches to the Design tab and shows the design-mode switch", async () => {
    renderFormPage(<BadgeFormPage mode="create" />);

    await userEvent.click(await screen.findByRole("tab", { name: "Design" }));
    expect(await screen.findByRole("button", { name: "Studio (layers)" })).toBeInTheDocument();
  });

  it("fetches and prefills an existing badge in edit mode", async () => {
    mswServer.use(
      http.get(`${API_BASE}/badges/admin/badge-1`, () =>
        HttpResponse.json({ success: true, data: badgeFixture }),
      ),
    );

    renderFormPage(<BadgeFormPage mode="edit" badgeId="badge-1" />);

    const nameInput = await screen.findByLabelText("Name");
    expect(nameInput).toHaveValue("Fashion Warrior");
  });

  it("shows an error state when the badge can't be loaded", async () => {
    mswServer.use(
      http.get(
        `${API_BASE}/badges/admin/missing`,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "nope" }), { status: 404 }),
      ),
    );

    renderFormPage(<BadgeFormPage mode="edit" badgeId="missing" />);

    expect(await screen.findByText("Couldn't load this badge.")).toBeInTheDocument();
  });

  it("seeds a 'Copy of' name when duplicating", async () => {
    mswServer.use(
      http.get(`${API_BASE}/badges/admin/badge-1`, () =>
        HttpResponse.json({ success: true, data: badgeFixture }),
      ),
    );

    renderFormPage(<BadgeFormPage mode="create" duplicateFromId="badge-1" />);

    const nameInput = await screen.findByLabelText("Name");
    expect(nameInput).toHaveValue("Copy of Fashion Warrior");
  });

  it("posts a new badge and returns to the list on success", async () => {
    const createHandler = vi.fn(async ({ request }: { request: Request }) => {
      await request.json();
      return HttpResponse.json(
        { success: true, data: { ...badgeFixture, id: "badge-new" } },
        {
          status: 201,
        },
      );
    });
    mswServer.use(http.post(`${API_BASE}/badges`, createHandler));

    renderFormPage(<BadgeFormPage mode="create" />);

    await userEvent.type(await screen.findByLabelText("Name"), "New one");
    await userEvent.type(screen.getByLabelText("Description"), "A description");
    await userEvent.click(
      screen.getByLabelText("Admin-award only (no automatic rule — awarded by hand)"),
    );
    await userEvent.click(screen.getByRole("button", { name: "Create badge" }));

    await waitFor(() => expect(createHandler).toHaveBeenCalled());
    expect(await screen.findByText("badges-list")).toBeInTheDocument();
  });

  it("patches an existing badge on save", async () => {
    const patchHandler = vi.fn(async ({ request }: { request: Request }) => {
      await request.json();
      return HttpResponse.json({ success: true, data: badgeFixture });
    });
    mswServer.use(
      http.get(`${API_BASE}/badges/admin/badge-1`, () =>
        HttpResponse.json({ success: true, data: badgeFixture }),
      ),
      http.patch(`${API_BASE}/badges/badge-1`, patchHandler),
    );

    renderFormPage(<BadgeFormPage mode="edit" badgeId="badge-1" />);

    await userEvent.type(await screen.findByLabelText("Name"), " updated");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(patchHandler).toHaveBeenCalled());
  });

  it("toggles the status checkboxes and surfaces a save error", async () => {
    mswServer.use(
      http.get(`${API_BASE}/badges/admin/badge-1`, () =>
        HttpResponse.json({ success: true, data: badgeFixture }),
      ),
      http.patch(
        `${API_BASE}/badges/badge-1`,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "That didn't work." }), {
            status: 422,
          }),
      ),
    );

    renderFormPage(<BadgeFormPage mode="edit" badgeId="badge-1" />);

    await userEvent.click(await screen.findByLabelText("Active (listed in the public catalog)"));
    await userEvent.click(screen.getByLabelText(/Engine evaluates this achievement/));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("That didn't work.")).toBeInTheDocument();
  });

  it("blocks the save and jumps to the Design tab when a studio badge has no layers", async () => {
    mswServer.use(
      http.get(`${API_BASE}/badges/admin/badge-1`, () =>
        HttpResponse.json({
          success: true,
          data: {
            ...badgeFixture,
            designConfig: {
              version: 2,
              layers: [
                {
                  id: "l",
                  type: "icon",
                  glyph: "x",
                  fontSize: 20,
                  x: 0,
                  y: 0,
                  width: 10,
                  height: 10,
                },
              ],
            },
          },
        }),
      ),
    );

    renderFormPage(<BadgeFormPage mode="edit" badgeId="badge-1" />);

    await userEvent.click(await screen.findByRole("tab", { name: "Design" }));
    await userEvent.click(await screen.findByRole("button", { name: "Remove layer" }));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Add at least one layer on the Design tab."),
    ).toBeInTheDocument();
  });
});
