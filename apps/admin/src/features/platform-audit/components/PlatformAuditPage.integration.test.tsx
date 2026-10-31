import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { PlatformAuditPage } from "./PlatformAuditPage";

const AUDIT_URL = "http://localhost:3000/api/platform/audit";
const FILTER_OPTIONS_URL = `${AUDIT_URL}/filters`;

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: "entry-1",
  actorUserId: "admin-1",
  actorName: "Asha Admin",
  onBehalfOfName: null,
  action: "outfit-build.archived-by-admin",
  targetType: "Outfit",
  targetId: "outfit-1",
  summary: "Archived a build",
  metadata: { reason: "Spam build" },
  ipAddress: null,
  createdAt: "2026-10-04T10:00:00.000Z",
  ...overrides,
});

const mockFilterOptions = () => {
  mswServer.use(
    http.get(FILTER_OPTIONS_URL, () =>
      okJson({
        actions: ["outfit-build.archived-by-admin", "user.suspended"],
        targetTypes: ["Outfit"],
        actors: [{ id: "admin-1", name: "Asha Admin" }],
      }),
    ),
  );
};

describe("PlatformAuditPage", () => {
  beforeEach(mockFilterOptions);

  it("lists entries in plain words, and filters by picking a choice", async () => {
    const requestedTargetTypes: (string | null)[] = [];
    mswServer.use(
      http.get(AUDIT_URL, ({ request }) => {
        requestedTargetTypes.push(new URL(request.url).searchParams.get("targetType"));
        return okJson({ entries: [entry()], nextCursor: null });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<PlatformAuditPage />, { path: "/platform/audit" });

    expect(await screen.findByText("Archived a build")).toBeInTheDocument();
    expect(screen.getByText(/Asha Admin/)).toBeInTheDocument();
    expect(screen.getByText("Outfit outfit-1")).toBeInTheDocument();
    expect(screen.getByText(/Outfit build archived by admin/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("What it affected"));
    await user.click(await screen.findByRole("option", { name: "Outfit" }));

    await waitFor(() => expect(requestedTargetTypes).toContain("Outfit"));
  });

  it("narrows the choices as you type and clears a picked choice", async () => {
    const requestedActors: (string | null)[] = [];
    mswServer.use(
      http.get(AUDIT_URL, ({ request }) => {
        requestedActors.push(new URL(request.url).searchParams.get("actorUserId"));
        return okJson({ entries: [entry()], nextCursor: null });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<PlatformAuditPage />, { path: "/platform/audit" });

    await user.type(await screen.findByLabelText("What happened"), "suspended");
    expect(await screen.findByRole("option", { name: "User suspended" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Outfit build archived by admin" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Who did it"));
    await user.click(await screen.findByRole("option", { name: "Asha Admin" }));
    await waitFor(() => expect(requestedActors).toContain("admin-1"));

    await user.click(screen.getByRole("button", { name: "Clear Who did it" }));
    await waitFor(() => expect(requestedActors.at(-1)).toBeNull());
  });

  it("still shows the log when the choices can't load", async () => {
    mswServer.use(
      http.get(FILTER_OPTIONS_URL, () =>
        HttpResponse.json({ success: false, message: "nope" }, { status: 500 }),
      ),
      http.get(AUDIT_URL, () => okJson({ entries: [entry()], nextCursor: null })),
    );
    renderWithRouter(<PlatformAuditPage />, { path: "/platform/audit" });

    expect(await screen.findByText("Archived a build")).toBeInTheDocument();
  });

  it("loads older entries and says when nothing matches", async () => {
    mswServer.use(
      http.get(AUDIT_URL, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        return okJson(
          cursor
            ? { entries: [entry({ id: "entry-2", summary: "Unlocked a build" })], nextCursor: null }
            : { entries: [entry()], nextCursor: "entry-1" },
        );
      }),
    );
    const user = userEvent.setup();
    const { unmount } = renderWithRouter(<PlatformAuditPage />, { path: "/platform/audit" });

    await user.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Unlocked a build")).toBeInTheDocument();
    unmount();

    mswServer.use(http.get(AUDIT_URL, () => okJson({ entries: [], nextCursor: null })));
    renderWithRouter(<PlatformAuditPage />, { path: "/platform/audit" });
    expect(await screen.findByText("Nothing matches these filters.")).toBeInTheDocument();
  });
});
