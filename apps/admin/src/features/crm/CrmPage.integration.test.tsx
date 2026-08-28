import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { CrmPage } from "./CrmPage";

const API_BASE = "http://localhost:3000/api";

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("CrmPage", () => {
  it("renders the organization banner alongside the members and invite sections", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organization`, () =>
        HttpResponse.json({
          success: true,
          data: {
            id: "org-1",
            name: "Outfiqe",
            subdomain: "outfiqe",
            plan: "trial",
            trialEndsAt: "2026-09-08T00:00:00.000Z",
            superAdminMembershipId: "membership-1",
            viewerIsSuperAdmin: true,
            viewerPermissionKeys: [],
          },
        }),
      ),
      http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${API_BASE}/crm/members`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${API_BASE}/crm/invites`, () => HttpResponse.json({ success: true, data: [] })),
    );

    render(<CrmPage />, { wrapper });

    expect(await screen.findByText(/Outfiqe · trial/)).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("Invite a staff member")).toBeInTheDocument();
  });

  it("hides members and invite sections for a role without those permissions", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organization`, () =>
        HttpResponse.json({
          success: true,
          data: {
            id: "org-1",
            name: "Meridian Apparel Co.",
            subdomain: "meridian",
            plan: "trial",
            trialEndsAt: "2026-09-08T00:00:00.000Z",
            superAdminMembershipId: "membership-1",
            viewerIsSuperAdmin: false,
            viewerPermissionKeys: ["org:read", "deals:read"],
          },
        }),
      ),
    );

    render(<CrmPage />, { wrapper });

    expect(await screen.findByText(/Meridian Apparel Co\. · trial/)).toBeInTheDocument();
    expect(screen.getByText("There's nothing here for your role yet.")).toBeInTheDocument();
    expect(screen.queryByText("Members")).not.toBeInTheDocument();
    expect(screen.queryByText("Invite a staff member")).not.toBeInTheDocument();
  });
});
