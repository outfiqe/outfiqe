import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";
import { AuthStatus, CreatorStatus, UserRole } from "@/features/auth/types";

import { ApplyAsCreatorButton } from "./ApplyAsCreatorButton";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const refresh = vi.fn();
const updateUser = vi.fn();

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh,
    prefetch: vi.fn(),
    bfcacheId: "test-bfcache-id",
  });
  vi.mocked(useAuth).mockReturnValue({
    state: {
      status: AuthStatus.AUTHENTICATED,
      user: {
        id: "user-1",
        name: "Ava Martinez",
        email: "ava@outfiqe.test",
        avatarUrl: null,
        role: UserRole.CUSTOMER,
        isCreator: false,
        creatorStatus: CreatorStatus.NONE,
      },
      accessToken: "t",
    },
    dispatch: vi.fn(),
    isAuthenticated: true,
    isAuthResolved: true,
    isBrandOwner: false,
    isAdmin: false,
    isCreator: false,
    isShopper: true,
    hasCrmAccess: false,
    logout: vi.fn(),
    updateUser,
  } as ReturnType<typeof useAuth>);
  refresh.mockClear();
  updateUser.mockClear();
});

const renderButton = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApplyAsCreatorButton />
    </QueryClientProvider>,
  );
};

describe("ApplyAsCreatorButton", () => {
  it("submits the application and refreshes the router on success", async () => {
    mswServer.use(
      http.post("/api/creators/apply", () =>
        HttpResponse.json({
          success: true,
          message: "Creator application submitted.",
          data: {
            userId: "user-1",
            name: "Ava Martinez",
            email: "ava@outfiqe.test",
            handle: "ava",
            avatarUrl: null,
            heightCm: null,
            showHeight: false,
            hideFromLeaderboards: false,
            isCreator: false,
            creatorStatus: "PENDING",
          },
        }),
      ),
    );

    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Apply to become a creator" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(updateUser).toHaveBeenCalledWith({ creatorStatus: "PENDING" });
  });

  it("replaces the button with a confirmation once submitted, so it can't be clicked again", async () => {
    mswServer.use(
      http.post("/api/creators/apply", () =>
        HttpResponse.json({
          success: true,
          message: "Creator application submitted.",
          data: {
            userId: "user-1",
            name: "Ava Martinez",
            email: "ava@outfiqe.test",
            handle: "ava",
            avatarUrl: null,
            heightCm: null,
            showHeight: false,
            hideFromLeaderboards: false,
            isCreator: false,
            creatorStatus: "PENDING",
          },
        }),
      ),
    );

    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Apply to become a creator" }));

    expect(await screen.findByText(/application submitted/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Apply to become a creator" }),
    ).not.toBeInTheDocument();
  });

  it("shows the pending label while the request is in flight", async () => {
    mswServer.use(
      http.post("/api/creators/apply", async () => {
        await delay(200);
        return HttpResponse.json({
          success: true,
          message: "Creator application submitted.",
          data: {
            userId: "user-1",
            name: "Ava Martinez",
            email: "ava@outfiqe.test",
            handle: "ava",
            avatarUrl: null,
            heightCm: null,
            showHeight: false,
            hideFromLeaderboards: false,
            isCreator: false,
            creatorStatus: "PENDING",
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Apply to become a creator" }));

    expect(await screen.findByRole("button", { name: "Loading" })).toBeDisabled();
  });

  it("shows an error message when the application fails", async () => {
    mswServer.use(
      http.post("/api/creators/apply", () =>
        HttpResponse.json({ success: false, message: "You've already applied." }, { status: 409 }),
      ),
    );

    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Apply to become a creator" }));

    expect(await screen.findByText("You've already applied.")).toBeInTheDocument();
  });
});
