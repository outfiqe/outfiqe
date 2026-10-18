import { mswServer } from "@test/integration/msw/server";
import {
  grantEveryPlatformPermission,
  grantOnlyPlatformPermissions,
} from "@test/platformPermissionsMock";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildHub,
  buildRider,
  emptyPage,
  HUBS_URL,
  LOGISTICS_API_BASE,
  okJson,
} from "../../testing/logisticsFixtures";
import { RidersPage } from "./RidersPage";

const RIDERS_URL = `${LOGISTICS_API_BASE}/riders`;
const INVITES_URL = `${RIDERS_URL}/invites`;

const renderRidersPage = () => renderWithRouter(<RidersPage />, { path: "/logistics/riders" });

const useHubWithRiders = (riders: unknown[]) =>
  mswServer.use(
    http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
    http.get(RIDERS_URL, () => okJson({ items: riders, nextCursor: null })),
    http.get(INVITES_URL, () => okJson({ invites: [] })),
  );

afterEach(() => {
  grantEveryPlatformPermission();
});

describe("RidersPage", () => {
  it("lists the hub's riders with their ID check", async () => {
    useHubWithRiders([buildRider()]);
    renderRidersPage();

    expect(await screen.findByText("Asha Rider")).toBeInTheDocument();
    expect(screen.getByText("ID checked: Citizenship card ending A1B2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suspend" })).toBeInTheDocument();
  });

  it("shows an empty state for a hub without riders", async () => {
    useHubWithRiders([]);
    renderRidersPage();

    expect(await screen.findByText("No riders at this hub yet.")).toBeInTheDocument();
  });

  it("records an in-person ID check for a new contractor", async () => {
    let checkBody: unknown;
    useHubWithRiders([
      buildRider({
        status: "PENDING_VERIFICATION",
        identityDocumentType: null,
        identityDocumentLast4: null,
        identityVerifiedAt: null,
      }),
    ]);
    mswServer.use(
      http.post(`${RIDERS_URL}/rider-1/identity-check`, async ({ request }) => {
        checkBody = await request.json();
        return okJson(buildRider());
      }),
    );
    const user = userEvent.setup();
    renderRidersPage();

    await user.click(await screen.findByRole("button", { name: "Check ID" }));
    await user.type(screen.getByLabelText("Last 4 characters of the document number"), "9x8y");
    await user.click(screen.getByRole("button", { name: "I checked it" }));

    await waitFor(() =>
      expect(checkBody).toEqual({ documentType: "CITIZENSHIP", documentLast4: "9x8y" }),
    );
  });

  it("invites a rider to the selected hub", async () => {
    let inviteBody: unknown;
    useHubWithRiders([]);
    mswServer.use(
      http.post(INVITES_URL, async ({ request }) => {
        inviteBody = await request.json();
        return okJson(null, 201);
      }),
    );
    const user = userEvent.setup();
    renderRidersPage();

    await user.click(await screen.findByRole("button", { name: "Invite rider" }));
    await user.type(screen.getByLabelText("Full name"), "Bikash Rider");
    await user.type(screen.getByLabelText("Email"), "bikash@outfiqe.test");
    await user.click(screen.getByRole("button", { name: "Send invite" }));

    await waitFor(() =>
      expect(inviteBody).toEqual({
        name: "Bikash Rider",
        email: "bikash@outfiqe.test",
        employmentType: "CONTRACTOR",
        hubId: "hub-1",
      }),
    );
  });

  it("hides rider changes from read-only staff", async () => {
    grantOnlyPlatformPermissions("platform:logistics:read");
    useHubWithRiders([buildRider()]);
    renderRidersPage();

    expect(await screen.findByText("Asha Rider")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suspend" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invite rider" })).not.toBeInTheDocument();
  });

  it("points to the hubs page when no hub is open", async () => {
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub({ isActive: false })] })),
      http.get(RIDERS_URL, () => okJson(emptyPage)),
      http.get(INVITES_URL, () => okJson({ invites: [] })),
    );
    renderRidersPage();

    expect(await screen.findByRole("link", { name: "Add a hub" })).toBeInTheDocument();
  });
});
