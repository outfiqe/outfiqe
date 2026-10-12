import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { grantOnlyPlatformPermissions } from "@test/platformPermissionsMock";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { OutfitBuildDetailPage } from "./OutfitBuildDetailPage";

const BUILD_URL = "http://localhost:3000/api/platform/builds/outfit-1";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const SITA = { id: "user-1", name: "Sita Rai", handle: "sita", avatarUrl: null };

const detail = (overrides: Record<string, unknown> = {}) => ({
  id: "outfit-1",
  title: "Dashain set",
  status: "LOCKED",
  visibility: "PUBLIC",
  version: 6,
  owner: SITA,
  memberCount: 1,
  itemCount: 1,
  photoCount: 1,
  likeCount: 0,
  commentCount: 0,
  isStartedInChat: false,
  removedAt: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-04T10:00:00.000Z",
  budget: null,
  publishedVersion: 5,
  lockedAt: "2026-10-03T10:00:00.000Z",
  archivedAt: null,
  members: [{ user: SITA, role: "OWNER", isHappy: true, joinedAt: "2026-10-01T10:00:00.000Z" }],
  items: [
    {
      slotLabel: "Top",
      position: 0,
      productId: "product-1",
      productName: "Maroon Kurta",
      imageUrl: null,
      price: 3_200,
      addedBy: SITA,
    },
  ],
  versions: [{ version: 5, total: 3_200, itemCount: 1, lockedAt: "2026-10-03T10:00:00.000Z" }],
  publishedItems: [
    {
      slotLabel: "Top",
      position: 0,
      productId: "product-1",
      productName: "Maroon Kurta",
      imageUrl: null,
      brandName: "Kastha",
      unitPrice: 3_200,
    },
  ],
  looks: [
    {
      id: "look-1",
      creator: SITA,
      sourceVersion: 5,
      isDeleted: false,
      createdAt: "2026-10-03T12:00:00.000Z",
    },
  ],
  photos: [
    {
      id: "photo-1",
      kind: "COVER",
      status: "READY",
      imageUrl: "https://cdn.outfiqe.test/photo-1.jpg",
      uploadedBy: SITA,
      coverPosition: 0,
      createdAt: "2026-10-02T10:00:00.000Z",
    },
  ],
  openReportCount: 2,
  ...overrides,
});

const history = {
  events: [
    {
      version: 6,
      type: "LOCKED",
      actor: SITA,
      payload: {},
      createdAt: "2026-10-03T10:00:00.000Z",
    },
  ],
  nextBeforeVersion: null,
};

const renderPage = () =>
  renderWithRouter(
    <>
      <OutfitBuildDetailPage outfitId="outfit-1" />
      <Toaster />
    </>,
    { path: "/outfit-builds/outfit-1" },
  );

describe("OutfitBuildDetailPage", () => {
  it("shows everything about the build and its history", async () => {
    mswServer.use(
      http.get(BUILD_URL, () => okJson(detail())),
      http.get(`${BUILD_URL}/history`, () => okJson(history)),
    );
    renderPage();

    expect(await screen.findByRole("heading", { name: "Dashain set" })).toBeInTheDocument();
    expect(screen.getByText("2 open reports")).toBeInTheDocument();
    expect(screen.getByText(/Maroon Kurta · Kastha/)).toBeInTheDocument();
    expect(screen.getByText(/· shown to viewers/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Photo added by Sita Rai" })).toBeInTheDocument();
    expect(await screen.findByText(/LOCKED/, { selector: "li" })).toBeInTheDocument();
  });

  it("unlocks the build with a reason", async () => {
    let unlockBody: unknown;
    mswServer.use(
      http.get(BUILD_URL, () => okJson(detail())),
      http.get(`${BUILD_URL}/history`, () => okJson(history)),
      http.post(`${BUILD_URL}/unlock`, async ({ request }) => {
        unlockBody = await request.json();
        return okJson(null);
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Unlock build" }));
    const dialog = await screen.findByRole("dialog", { name: "Unlock this build" });
    await user.type(within(dialog).getByRole("textbox"), "Owner asked to reopen it.");
    await user.click(within(dialog).getByRole("button", { name: "Unlock build" }));

    await waitFor(() => expect(unlockBody).toEqual({ reason: "Owner asked to reopen it." }));
    expect(await screen.findByText("Build updated.")).toBeInTheDocument();
  });

  it("offers only archive on a draft, and no actions to read-only staff", async () => {
    mswServer.use(
      http.get(BUILD_URL, () => okJson(detail({ status: "DRAFT" }))),
      http.get(`${BUILD_URL}/history`, () => okJson(history)),
    );
    const { unmount } = renderPage();

    expect(await screen.findByRole("button", { name: "Archive build" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unlock build" })).not.toBeInTheDocument();
    unmount();

    grantOnlyPlatformPermissions("platform:builds:read");
    renderPage();
    expect(await screen.findByRole("heading", { name: "Dashain set" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive build" })).not.toBeInTheDocument();
  });
});
