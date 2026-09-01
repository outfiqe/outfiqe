import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { PlatformFeaturesPage } from "./PlatformFeaturesPage";

const API_BASE = "http://localhost:3000/api";

const mockBase = () => {
  mswServer.use(
    http.get(`${API_BASE}/platform/metrics/tenants`, () =>
      HttpResponse.json({
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
              memberCount: 1,
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
      }),
    ),
    http.get(`${API_BASE}/platform/features/registry`, () =>
      HttpResponse.json({
        success: true,
        data: [
          {
            key: "gamification",
            label: "Gamification",
            description: "XP and badges.",
            registryDefault: true,
            planDefaults: { starter: true },
          },
        ],
      }),
    ),
  );
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <PlatformFeaturesPage />
    </QueryClientProvider>,
  );
};

describe("PlatformFeaturesPage", () => {
  it("shows a tenant's resolved features once one is picked and toggles an override", async () => {
    mockBase();
    mswServer.use(
      http.get(`${API_BASE}/platform/features/tenants/org-1`, () =>
        HttpResponse.json({
          success: true,
          data: [{ key: "gamification", enabled: true, source: "plan", metadata: {} }],
        }),
      ),
    );
    let putBody: Record<string, unknown> | null = null;
    mswServer.use(
      http.put(`${API_BASE}/platform/features/tenants/org-1/gamification`, async ({ request }) => {
        putBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    renderPage();

    await screen.findByRole("option", { name: /Meridian/ });
    await userEvent.selectOptions(screen.getByLabelText("Tenant"), "org-1");

    expect(await screen.findByText("Gamification")).toBeInTheDocument();
    expect(screen.getByText("Plan default")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(putBody).toMatchObject({ enabled: false }));
  });

  it("prompts to pick a tenant before anything is selected", async () => {
    mockBase();
    renderPage();
    expect(await screen.findByText(/Pick a tenant to see its features/i)).toBeInTheDocument();
  });
});
