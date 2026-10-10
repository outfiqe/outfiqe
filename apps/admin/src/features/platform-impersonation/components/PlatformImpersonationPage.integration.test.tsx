import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlatformImpersonationPage } from "./PlatformImpersonationPage";

const API_BASE = "http://localhost:3000/api";

const tenantsResponse = {
  success: true,
  data: {
    items: [
      {
        organizationId: "org-1",
        name: "Meridian",
        subdomain: "meridian",
        plan: "starter",
        subscriptionStatus: null,
        isPlatformOrg: false,
        linkedBrandId: null,
        memberCount: 2,
        contactCount: 0,
        dealCount: 0,
        ticketCount: 0,
        activityCount: 0,
        lastCrmActivityAt: null,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ],
    total: 1,
    hasMore: false,
  },
};

const buildSession = (overrides: Record<string, unknown> = {}) => ({
  id: "sess-1",
  organizationId: "org-1",
  organizationName: "Meridian",
  impersonatorId: "staff-1",
  impersonatorName: "Sam Staff",
  targetUserId: "user-9",
  targetUserName: "Tara Tenant",
  scope: "read",
  reason: "looking into a billing issue",
  createdAt: "2026-06-02T10:00:00.000Z",
  expiresAt: "2026-06-02T10:30:00.000Z",
  lastSeenAt: null,
  revokedAt: null,
  revokedById: null,
  active: true,
  ...overrides,
});

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <PlatformImpersonationPage />
    </QueryClientProvider>,
  );
};

describe("PlatformImpersonationPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists active sessions and revokes one", async () => {
    let revokedId: string | null = null;
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants`, () => HttpResponse.json(tenantsResponse)),
      http.get(`${API_BASE}/platform/impersonation/active`, () =>
        HttpResponse.json({ success: true, data: [buildSession()] }),
      ),
      http.get(`${API_BASE}/platform/impersonation`, () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
      http.delete(`${API_BASE}/platform/impersonation/sess-1`, () => {
        revokedId = "sess-1";
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    renderPage();

    expect(await screen.findByText("Tara Tenant")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(revokedId).toBe("sess-1"));
  });

  it("opens a hand-off tab with a one-time code, not the raw token, in the URL", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants`, () => HttpResponse.json(tenantsResponse)),
      http.get(`${API_BASE}/platform/impersonation/active`, () =>
        HttpResponse.json({ success: true, data: [buildSession()] }),
      ),
      http.get(`${API_BASE}/platform/impersonation`, () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
      http.post(`${API_BASE}/platform/impersonation/sess-1/open`, () =>
        HttpResponse.json({
          success: true,
          data: { code: "one-time-code", tenantSubdomain: "meridian", expiresInSeconds: 60 },
        }),
      ),
    );

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Open" }));

    await waitFor(() => expect(openSpy).toHaveBeenCalled());
    const [handoffUrl] = openSpy.mock.calls[0] ?? [];
    expect(String(handoffUrl)).toContain("meridian");
    expect(String(handoffUrl)).toContain("impersonation_code=one-time-code");
    expect(String(handoffUrl)).not.toContain("minted-access-token");
  });

  it("starts a session and reveals the minted token", async () => {
    let startBody: Record<string, unknown> | null = null;
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants`, () => HttpResponse.json(tenantsResponse)),
      http.get(`${API_BASE}/platform/impersonation/active`, () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
      http.get(`${API_BASE}/platform/impersonation`, () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
      http.get(`${API_BASE}/platform/impersonation/candidates`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              userId: "user-9",
              name: "Tara Tenant",
              email: "tara@meridian.test",
              roleName: "Admin",
            },
          ],
        }),
      ),
      http.post(`${API_BASE}/platform/impersonation`, async ({ request }) => {
        startBody = (await request.json()) as Record<string, unknown>;
        await delay(100);
        return HttpResponse.json({
          success: true,
          data: {
            token: "minted-access-token",
            expiresAt: "2026-06-02T10:30:00.000Z",
            session: buildSession(),
          },
        });
      }),
    );

    renderPage();

    await screen.findByRole("option", { name: /Meridian/ });
    await userEvent.selectOptions(screen.getByLabelText("Tenant"), "org-1");
    await screen.findByRole("option", { name: /Tara Tenant/ });
    await userEvent.selectOptions(screen.getByLabelText("Act as"), "user-9");
    await userEvent.type(screen.getByLabelText(/Reason/), "confirming a refund was applied");
    const startButton = screen.getByRole("button", { name: "Start session" });
    await userEvent.click(startButton);

    await waitFor(() => expect(startButton).toHaveAttribute("aria-busy", "true"));
    await waitFor(() =>
      expect(startBody).toMatchObject({ organizationId: "org-1", scope: "read" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Reveal access token" }));
    expect(screen.getByDisplayValue("minted-access-token")).toBeInTheDocument();
  });

  it("shows inline messages, not a browser popup, and sends nothing for an empty form", async () => {
    let startRequested = false;
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants`, () => HttpResponse.json(tenantsResponse)),
      http.get(`${API_BASE}/platform/impersonation/active`, () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
      http.get(`${API_BASE}/platform/impersonation`, () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
      http.post(`${API_BASE}/platform/impersonation`, () => {
        startRequested = true;
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Start session" }));

    expect(await screen.findByText("Pick a tenant.")).toBeInTheDocument();
    expect(screen.getByText("Pick a member to act as.")).toBeInTheDocument();
    expect(screen.getByText("Enter a reason for the audit trail.")).toBeInTheDocument();
    expect(startRequested).toBe(false);
  });

  it("tells a naturally expired session apart from one someone revoked", async () => {
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants`, () => HttpResponse.json(tenantsResponse)),
      http.get(`${API_BASE}/platform/impersonation/active`, () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
      http.get(`${API_BASE}/platform/impersonation`, () =>
        HttpResponse.json({
          success: true,
          data: [
            buildSession({
              id: "sess-expired",
              targetUserName: "Expired Tenant",
              active: false,
              revokedAt: "2026-06-02T10:30:00.000Z",
              revokedById: null,
            }),
            buildSession({
              id: "sess-revoked",
              targetUserName: "Revoked Tenant",
              active: false,
              revokedAt: "2026-06-02T10:15:00.000Z",
              revokedById: "staff-1",
            }),
          ],
        }),
      ),
    );

    renderPage();

    const expiredRow = (await screen.findByText("Expired Tenant")).closest("tr");
    const revokedRow = (await screen.findByText("Revoked Tenant")).closest("tr");
    expect(expiredRow).toHaveTextContent("Expired");
    expect(revokedRow).toHaveTextContent("Revoked");
  });

  it("explains minutes outside the allowed range", async () => {
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants`, () => HttpResponse.json(tenantsResponse)),
      http.get(`${API_BASE}/platform/impersonation/active`, () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
      http.get(`${API_BASE}/platform/impersonation`, () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
    );

    renderPage();

    await userEvent.type(await screen.findByLabelText("Minutes (optional)"), "90");
    await userEvent.click(screen.getByRole("button", { name: "Start session" }));

    expect(await screen.findByText("Use a number from 1 to 60 minutes.")).toBeInTheDocument();
  });
});
