import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/features/auth/AuthContext";

import { ProfilePage } from "./ProfilePage";

const API_BASE = "http://localhost:3000/api";

const mockSignedInSession = () => {
  mswServer.use(
    http.post(`${API_BASE}/auth/refresh`, () =>
      HttpResponse.json({ success: true, message: "Refreshed.", data: { accessToken: "token" } }),
    ),
    http.get(`${API_BASE}/auth/me`, () =>
      HttpResponse.json({
        success: true,
        message: "Current user.",
        data: {
          id: "user-1",
          name: "Test User",
          email: "test-user@outfiqe.test",
          avatarUrl: null,
          role: "ADMIN",
          hasPlatformAccess: false,
          isCoFounder: false,
          hiddenPlatformNavKeys: [],
        },
      }),
    ),
  );
};

const renderProfilePage = () => {
  mockSignedInSession();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfilePage />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>,
  );
};

describe("admin ProfilePage", () => {
  it("saves a name change from the real PATCH /users/me response shape", async () => {
    mswServer.use(
      http.patch(`${API_BASE}/users/me`, async ({ request }) => {
        const body = (await request.json()) as { name?: string };
        return HttpResponse.json({
          success: true,
          message: "Profile updated.",
          data: {
            id: "user-1",
            email: "test-user@outfiqe.test",
            name: body.name,
            handle: "test-user",
            avatarUrl: null,
            role: "ADMIN",
            isCreator: false,
            creatorStatus: "NONE",
            emailVerified: true,
            accountStatus: "ACTIVE",
            suspendedAt: null,
            suspendedBy: null,
            suspensionReason: null,
            suspensionExpiresAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        });
      }),
    );
    const user = userEvent.setup();
    renderProfilePage();

    const nameInput = await screen.findByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Name");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Profile updated.")).toBeInTheDocument();
    expect(screen.queryByText(/expected/i)).not.toBeInTheDocument();
  });

  it("shows a safe fallback message, never a raw error, when the response fails re-validation", async () => {
    mswServer.use(
      http.patch(`${API_BASE}/users/me`, () =>
        HttpResponse.json({
          success: true,
          message: "Profile updated.",
          data: { id: "user-1", email: "test-user@outfiqe.test" },
        }),
      ),
    );
    const user = userEvent.setup();
    renderProfilePage();

    const nameInput = await screen.findByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Name");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/invalid_type|zod|expected string/i)).not.toBeInTheDocument();
  });

  it("shows the server-provided message, not a generic error, on a genuine API failure", async () => {
    mswServer.use(
      http.patch(`${API_BASE}/users/me`, () =>
        HttpResponse.json(
          { success: false, message: "That name is not allowed.", code: "INVALID_NAME" },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderProfilePage();

    const nameInput = await screen.findByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Name");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("That name is not allowed.")).toBeInTheDocument();
  });

  it("shows an inline message, not a browser popup, when the name is cleared", async () => {
    const patchRequested = vi.fn();
    mswServer.use(
      http.patch(`${API_BASE}/users/me`, () => {
        patchRequested();
        return HttpResponse.json({ success: true, message: "ok", data: {} });
      }),
    );
    const user = userEvent.setup();
    renderProfilePage();

    const nameInput = await screen.findByLabelText("Name");
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Enter your name.")).toBeInTheDocument();
    expect(patchRequested).not.toHaveBeenCalled();
  });
});
