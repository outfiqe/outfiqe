import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";
import { AuthStatus, CreatorStatus, UserRole, type UserSession } from "@/features/auth/types";

import { EditOwnProfileCard } from "./EditOwnProfileCard";

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

const buildUserSession = (): UserSession => ({
  id: "user-1",
  name: "Session User",
  email: "session-user@outfiqe.test",
  avatarUrl: null,
  role: UserRole.CUSTOMER,
  isCreator: false,
  creatorStatus: CreatorStatus.NONE,
});

const mockAuth = (updateUser = vi.fn()) => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    isAuthResolved: true,
    isBrandOwner: false,
    isAdmin: false,
    isCreator: false,
    isShopper: true,
    hasCrmAccess: false,
    state: {
      user: buildUserSession(),
      accessToken: "test-access-token",
      status: AuthStatus.AUTHENTICATED,
    },
    dispatch: vi.fn(),
    logout: vi.fn(),
    updateUser,
  });
  return updateUser;
};

const renderCard = (overrides: Partial<Parameters<typeof EditOwnProfileCard>[0]> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditOwnProfileCard
        userId="user-1"
        name="Sam Rai"
        handle="samrai"
        avatarUrl={null}
        {...overrides}
      />
      <Toaster />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  mockAuth();
});

describe("EditOwnProfileCard", () => {
  it("renders the current name and handle", () => {
    renderCard();

    expect(screen.getByText("Sam Rai")).toBeInTheDocument();
    expect(screen.getByText("@samrai")).toBeInTheDocument();
  });

  it("opens and closes the edit modal", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Edit profile" })).not.toBeInTheDocument();
  });

  it("saves a new display name through the real API and reflects it", async () => {
    mswServer.use(
      http.patch("/api/users/me", () =>
        HttpResponse.json({ success: true, message: "Profile updated.", data: {} }),
      ),
    );

    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const nameInput = screen.getByLabelText("Display name");
    await user.clear(nameInput);
    await user.type(nameInput, "Samir Rai");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Samir Rai")).toBeInTheDocument();
  });

  it("doesn't call the API when saving a blank name", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const nameInput = screen.getByLabelText("Display name");
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("disables Save immediately for a badly formatted handle, without calling the availability endpoint", async () => {
    const availabilityCheck = vi.fn();
    mswServer.use(
      http.get("/api/users/handle-availability", () => {
        availabilityCheck();
        return HttpResponse.json({
          success: true,
          message: "Available.",
          data: { available: true },
        });
      }),
    );

    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const handleInput = screen.getByLabelText("Username");
    await user.clear(handleInput);
    await user.type(handleInput, "AB");

    expect(
      screen.getByText(
        "3-20 characters, start with a letter, lowercase letters/numbers/underscores only",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(availabilityCheck).not.toHaveBeenCalled();
  });

  it("shows a taken message and disables Save when the handle is already in use", async () => {
    mswServer.use(
      http.get("/api/users/handle-availability", () =>
        HttpResponse.json({ success: true, message: "Taken.", data: { available: false } }),
      ),
    );

    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const handleInput = screen.getByLabelText("Username");
    await user.clear(handleInput);
    await user.type(handleInput, "takenhandle");

    await waitFor(() =>
      expect(screen.getByText("That username is already taken")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves a new handle, updates the @handle display, and syncs the auth session", async () => {
    mswServer.use(
      http.get("/api/users/handle-availability", () =>
        HttpResponse.json({ success: true, message: "Available.", data: { available: true } }),
      ),
      http.patch("/api/users/me", () =>
        HttpResponse.json({ success: true, message: "Profile updated.", data: {} }),
      ),
    );
    const updateUser = mockAuth();

    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const handleInput = screen.getByLabelText("Username");
    await user.clear(handleInput);
    await user.type(handleInput, "newsamrai");

    await waitFor(() => expect(screen.getByText("Username is available")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("@newsamrai")).toBeInTheDocument();
    expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ handle: "newsamrai" }));
  });

  it("surfaces the backend's cooldown message when the account is still cooling down", async () => {
    mswServer.use(
      http.get("/api/users/handle-availability", () =>
        HttpResponse.json({ success: true, message: "Available.", data: { available: true } }),
      ),
      http.patch("/api/users/me", () =>
        HttpResponse.json(
          {
            success: false,
            message: "You can change your username again on 2026-09-20.",
            code: "HANDLE_CHANGE_COOLING_DOWN",
          },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const handleInput = screen.getByLabelText("Username");
    await user.clear(handleInput);
    await user.type(handleInput, "newsamrai");

    await waitFor(() => expect(screen.getByText("Username is available")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("You can change your username again on 2026-09-20."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeInTheDocument();
  });
});
