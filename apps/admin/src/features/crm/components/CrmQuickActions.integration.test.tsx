import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { CrmQuickActions } from "./CrmQuickActions";

const API_BASE = "http://localhost:3000/api";

const mockViewer = (viewerIsSuperAdmin: boolean, viewerPermissionKeys: string[]) =>
  mswServer.use(
    http.get(`${API_BASE}/crm/organization`, () =>
      HttpResponse.json({
        success: true,
        data: {
          id: "o-1",
          name: "Meridian",
          plan: "trial",
          trialEndsAt: null,
          linkedBrandId: "brand-1",
          superAdminMembershipId: "m-1",
          pendingOwnershipTransfer: null,
          advancedFeaturesEnabled: true,
          viewerIsSuperAdmin,
          viewerPermissionKeys,
        },
      }),
    ),
  );

describe("CrmQuickActions", () => {
  it("opens the new record form on the right page", async () => {
    mockViewer(true, []);
    renderWithRouter(<CrmQuickActions />);

    const contactLink = await screen.findByRole("link", { name: "New contact" });
    expect(contactLink.getAttribute("href")).toContain("/crm/contacts");
    expect(contactLink.getAttribute("href")).toContain("new=yes");
    expect(screen.getByRole("link", { name: "New task" })).toBeInTheDocument();
  });

  it("only offers what the viewer is allowed to add", async () => {
    mockViewer(false, ["tickets:write"]);
    renderWithRouter(<CrmQuickActions />);

    expect(await screen.findByRole("link", { name: "New ticket" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New contact" })).not.toBeInTheDocument();
  });

  it("shows nothing to a viewer who can't add anything", async () => {
    mockViewer(false, ["org:read"]);
    renderWithRouter(<CrmQuickActions />);

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Quick actions" })).not.toBeInTheDocument(),
    );
  });
});
