import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { PlatformNavAccessPage } from "./PlatformNavAccessPage";

const API_BASE = "http://localhost:3000/api";

const mockAuthState = vi.hoisted(() => ({ current: { isCoFounder: true } }));

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({
    state: { status: "signed-in", user: { id: "me", ...mockAuthState.current } },
  }),
}));

const overview = (hiddenNavKeys: string[]) => ({
  success: true,
  data: {
    isCoFounder: true,
    hiddenNavKeys,
    coFounders: [
      { membershipId: "m-1", userId: "u-1", name: "Prapti", email: "prapti@outfiqe.com" },
      { membershipId: "m-2", userId: "u-2", name: "Mun", email: "mun@outfiqe.com" },
    ],
  },
});

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <PlatformNavAccessPage />
    </QueryClientProvider>,
  );
};

describe("PlatformNavAccessPage", () => {
  it("hides a nav item when its switch is turned off", async () => {
    mockAuthState.current = { isCoFounder: true };
    let putBody: { hiddenNavKeys: string[] } | null = null;
    mswServer.use(
      http.get(`${API_BASE}/platform/nav-access`, () => HttpResponse.json(overview([]))),
      http.get(`${API_BASE}/platform/nav-access/co-founders/candidates`, () =>
        HttpResponse.json({
          success: true,
          data: [{ membershipId: "m-3", userId: "u-3", name: "Anjesh", email: "a@outfiqe.local" }],
        }),
      ),
      http.put(`${API_BASE}/platform/nav-access/hidden`, async ({ request }) => {
        putBody = (await request.json()) as { hiddenNavKeys: string[] };
        return HttpResponse.json({ success: true, data: { hiddenNavKeys: putBody.hiddenNavKeys } });
      }),
    );

    renderPage();

    const gamificationSwitch = await screen.findByLabelText("Gamification visibility");
    expect(gamificationSwitch).toBeChecked();

    await userEvent.click(gamificationSwitch);
    await waitFor(() => expect(putBody).toEqual({ hiddenNavKeys: ["gamification"] }));
  });

  it("promotes a selected member to co-founder", async () => {
    mockAuthState.current = { isCoFounder: true };
    let promotedMembershipId: string | null = null;
    mswServer.use(
      http.get(`${API_BASE}/platform/nav-access`, () => HttpResponse.json(overview([]))),
      http.get(`${API_BASE}/platform/nav-access/co-founders/candidates`, () =>
        HttpResponse.json({
          success: true,
          data: [{ membershipId: "m-3", userId: "u-3", name: "Anjesh", email: "a@outfiqe.local" }],
        }),
      ),
      http.post(`${API_BASE}/platform/nav-access/co-founders`, async ({ request }) => {
        promotedMembershipId = ((await request.json()) as { membershipId: string }).membershipId;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    renderPage();

    await screen.findByRole("option", { name: /Anjesh/ });
    await userEvent.selectOptions(screen.getByLabelText("Add a co-founder"), "m-3");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(promotedMembershipId).toBe("m-3"));
  });

  it("removes a co-founder", async () => {
    mockAuthState.current = { isCoFounder: true };
    let deletedMembershipId: string | null = null;
    mswServer.use(
      http.get(`${API_BASE}/platform/nav-access`, () => HttpResponse.json(overview(["team"]))),
      http.get(`${API_BASE}/platform/nav-access/co-founders/candidates`, () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
      http.delete(`${API_BASE}/platform/nav-access/co-founders/:id`, ({ params }) => {
        deletedMembershipId = params.id as string;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    renderPage();

    const removeButtons = await screen.findAllByRole("button", { name: "Remove" });
    await userEvent.click(removeButtons[0]!);
    await waitFor(() => expect(deletedMembershipId).toBe("m-1"));
  });

  it("shows a notice and no controls for a non-co-founder", () => {
    mockAuthState.current = { isCoFounder: false };
    renderPage();
    expect(
      screen.getByText("Only co-founders can manage platform navigation access."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Navigation items")).not.toBeInTheDocument();
  });
});
