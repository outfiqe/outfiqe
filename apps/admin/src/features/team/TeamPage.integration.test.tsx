import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { TeamPage } from "./TeamPage";

const API_BASE = "http://localhost:3000/api";

const mockAuthState = vi.hoisted(() => ({ current: { isCoFounder: true } }));

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({
    state: { status: "signed-in", user: { id: "me", ...mockAuthState.current } },
  }),
}));

const invite = (overrides: Partial<Record<string, unknown>>) => ({
  id: "invite-1",
  email: "someone@outfiqe.test",
  name: "Someone",
  roleId: "role-admin",
  roleName: "Admin",
  status: "ACCEPTED",
  isCoFounder: false,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  ...overrides,
});

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <TeamPage />
      <Toaster />
    </QueryClientProvider>,
  );
};

const mockInvitesEndpoint = (
  invites: ReturnType<typeof invite>[],
  viewerPermissionKeys: string[] = [],
) =>
  mswServer.use(
    http.get(`${API_BASE}/admin/invites`, () =>
      HttpResponse.json({
        success: true,
        message: "Invites.",
        data: { invites, viewerPermissionKeys },
      }),
    ),
  );

const mockCoFounderOnlyEndpoints = () =>
  mswServer.use(
    http.get(`${API_BASE}/platform/roles`, () =>
      HttpResponse.json({
        success: true,
        data: [{ id: "role-1", name: "Support", isBuiltIn: false, permissionKeys: [] }],
      }),
    ),
    http.get(`${API_BASE}/platform/permissions`, () =>
      HttpResponse.json({ success: true, data: [] }),
    ),
    http.get(`${API_BASE}/platform/team`, () => HttpResponse.json({ success: true, data: [] })),
  );

describe("TeamPage", () => {
  it("shows a Co-founder badge only on the rows whose account is a co-founder", async () => {
    mockAuthState.current = { isCoFounder: true };
    mockCoFounderOnlyEndpoints();
    mockInvitesEndpoint([
      invite({
        id: "cf",
        name: "Prapti Bidari",
        email: "prapti@outfiqe.com",
        isCoFounder: true,
      }),
      invite({ id: "plain", name: "Regular Admin", email: "regular@outfiqe.com" }),
    ]);

    renderPage();

    const coFounderRow = (await screen.findByText("Prapti Bidari")).closest("div");
    const plainRow = screen.getByText("Regular Admin").closest("div");

    expect(within(coFounderRow as HTMLElement).getByText("Co-founder")).toBeInTheDocument();
    expect(within(plainRow as HTMLElement).queryByText("Co-founder")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no invites", async () => {
    mockAuthState.current = { isCoFounder: true };
    mockCoFounderOnlyEndpoints();
    mockInvitesEndpoint([]);

    renderPage();

    expect(await screen.findByText("No invites yet.")).toBeInTheDocument();
  });

  it("shows the invite form and role manager to a co-founder", async () => {
    mockAuthState.current = { isCoFounder: true };
    mockCoFounderOnlyEndpoints();
    mockInvitesEndpoint([]);

    renderPage();

    expect(await screen.findByRole("button", { name: "Invite admin" })).toBeInTheDocument();
    expect(screen.getByText("Platform roles")).toBeInTheDocument();
    expect(screen.getByText("Platform team")).toBeInTheDocument();
  });

  it("hides the invite form and role manager, and explains why, for a non-co-founder", async () => {
    mockAuthState.current = { isCoFounder: false };
    mockInvitesEndpoint([]);

    renderPage();

    expect(
      await screen.findByText("You don’t have permission to invite new admins."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invite admin" })).not.toBeInTheDocument();
    expect(screen.queryByText("Platform roles")).not.toBeInTheDocument();
    expect(screen.queryByText("Platform team")).not.toBeInTheDocument();
  });

  it("shows inline messages, not a browser popup, when the invite form is submitted empty", async () => {
    mockAuthState.current = { isCoFounder: true };
    mockCoFounderOnlyEndpoints();
    mockInvitesEndpoint([]);
    const inviteRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/admin/invites`, () => {
        inviteRequested();
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Invite admin" }));

    expect(await screen.findByText("Enter the person's name.")).toBeInTheDocument();
    expect(screen.getByText("Enter an email address.")).toBeInTheDocument();
    expect(screen.getByText("Choose a platform role for this invite.")).toBeInTheDocument();
    expect(inviteRequested).not.toHaveBeenCalled();
  });

  it("explains an invalid email address and does not send the invite", async () => {
    mockAuthState.current = { isCoFounder: true };
    mockCoFounderOnlyEndpoints();
    mockInvitesEndpoint([]);
    const inviteRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/admin/invites`, () => {
        inviteRequested();
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    renderPage();
    await userEvent.type(await screen.findByLabelText("Name"), "Tara Tenant");
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.selectOptions(await screen.findByLabelText("Role"), "role-1");
    await userEvent.click(screen.getByRole("button", { name: "Invite admin" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(inviteRequested).not.toHaveBeenCalled();
  });

  it("sends the invite, clears the form and shows a success toast", async () => {
    mockAuthState.current = { isCoFounder: true };
    mockCoFounderOnlyEndpoints();
    mockInvitesEndpoint([]);
    let inviteBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/admin/invites`, async ({ request }) => {
        inviteBody = await request.json();
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    renderPage();
    const nameField = await screen.findByLabelText("Name");
    await userEvent.type(nameField, "Tara Tenant");
    await userEvent.type(screen.getByLabelText("Email"), "tara@outfiqe.test");
    await userEvent.selectOptions(await screen.findByLabelText("Role"), "role-1");
    await userEvent.click(screen.getByRole("button", { name: "Invite admin" }));

    await waitFor(() =>
      expect(inviteBody).toEqual({
        email: "tara@outfiqe.test",
        name: "Tara Tenant",
        roleId: "role-1",
      }),
    );
    expect(await screen.findByText("Invite sent to tara@outfiqe.test.")).toBeInTheDocument();
    await waitFor(() => expect(nameField).toHaveValue(""));
  });

  it("shows the server's reason when the invite is rejected", async () => {
    mockAuthState.current = { isCoFounder: true };
    mockCoFounderOnlyEndpoints();
    mockInvitesEndpoint([]);
    mswServer.use(
      http.post(`${API_BASE}/admin/invites`, () =>
        HttpResponse.json(
          { success: false, message: "That email already has an account." },
          { status: 409 },
        ),
      ),
    );

    renderPage();
    await userEvent.type(await screen.findByLabelText("Name"), "Tara Tenant");
    await userEvent.type(screen.getByLabelText("Email"), "tara@outfiqe.test");
    await userEvent.selectOptions(await screen.findByLabelText("Role"), "role-1");
    await userEvent.click(screen.getByRole("button", { name: "Invite admin" }));

    expect(await screen.findByText("That email already has an account.")).toBeInTheDocument();
  });
});
