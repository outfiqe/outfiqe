import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { PlatformAuditPage } from "./PlatformAuditPage";

const AUDIT_URL = "http://localhost:3000/api/platform/audit";

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

describe("PlatformAuditPage", () => {
  it("lists entries with their details, and filters by target", async () => {
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

    await user.type(screen.getByLabelText("Target type"), "Outfit");
    await user.click(screen.getByRole("button", { name: "Filter" }));

    await waitFor(() => expect(requestedTargetTypes).toContain("Outfit"));
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
