import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ImpersonationActivityBanner } from "./ImpersonationActivityBanner";

const API_BASE = "http://localhost:3000/api";

const organization = (activeImpersonation: unknown) => ({
  id: "org-1",
  name: "Meridian",
  plan: "starter",
  trialEndsAt: null,
  linkedBrandId: null,
  superAdminMembershipId: "mem-1",
  viewerIsSuperAdmin: true,
  viewerPermissionKeys: ["org:read", "org:update", "audit:read"],
  pendingOwnershipTransfer: null,
  advancedFeaturesEnabled: true,
  features: {},
  activeImpersonation,
});

const renderBanner = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ImpersonationActivityBanner />
    </QueryClientProvider>,
  );
};

describe("ImpersonationActivityBanner", () => {
  it("renders nothing when no support session is active", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organization`, () =>
        HttpResponse.json({ success: true, data: organization(null) }),
      ),
    );
    renderBanner();
    await waitFor(() => expect(screen.queryByText(/support/i)).not.toBeInTheDocument());
  });

  it("shows the active session and ends it on request", async () => {
    let ended = false;
    mswServer.use(
      http.get(`${API_BASE}/crm/organization`, () =>
        HttpResponse.json({
          success: true,
          data: organization({ byName: "Sam Staff", since: "2026-06-02T10:00:00.000Z" }),
        }),
      ),
      http.get(`${API_BASE}/crm/organization/impersonation-log`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: "log-1",
              kind: "started",
              staffName: "Sam Staff",
              at: "2026-06-02T10:00:00.000Z",
              reason: "billing check",
              scope: "read",
            },
          ],
        }),
      ),
      http.post(`${API_BASE}/crm/organization/end-impersonation`, () => {
        ended = true;
        return HttpResponse.json({ success: true, data: { endedCount: 1 } });
      }),
    );

    renderBanner();

    expect(await screen.findByText(/Sam Staff/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "View activity" }));
    expect(await screen.findByText(/billing check/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "End session" }));
    await waitFor(() => expect(ended).toBe(true));
  });
});
