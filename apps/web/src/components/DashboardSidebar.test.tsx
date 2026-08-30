import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus, CreatorStatus, UserRole, type UserSession } from "@/features/auth/types";

import { DashboardSidebar } from "./DashboardSidebar";

vi.mock("@/features/auth", () => ({
  useAuth: vi.fn(),
  useLogout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => ({ push: vi.fn() }),
}));

const buildUser = (overrides: Partial<UserSession> = {}): UserSession => ({
  id: "user-1",
  name: "Bikash Shrestha",
  email: "bikash@outfiqe.test",
  avatarUrl: null,
  role: UserRole.BRAND_OWNER,
  isCreator: false,
  creatorStatus: CreatorStatus.NONE,
  ...overrides,
});

const mockAuth = (overrides: Partial<ReturnType<typeof useAuth>>) => {
  vi.mocked(useAuth).mockReturnValue({
    state: { status: AuthStatus.AUTHENTICATED, user: buildUser(), accessToken: "token" },
    isAuthenticated: true,
    isAuthResolved: true,
    isBrandOwner: true,
    isAdmin: false,
    isCreator: false,
    hasCrmAccess: false,
    dispatch: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAuth>);
};

beforeAll(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }),
  );
});

const buildIdleLogoutMutation = (): ReturnType<typeof useLogout> => ({
  context: undefined,
  data: undefined,
  error: null,
  failureCount: 0,
  failureReason: null,
  isPaused: false,
  status: "idle",
  variables: undefined,
  submittedAt: 0,
  isError: false,
  isIdle: true,
  isPending: false,
  isSuccess: false,
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  reset: vi.fn(),
});

describe("DashboardSidebar", () => {
  beforeEach(() => {
    vi.mocked(useLogout).mockReturnValue(buildIdleLogoutMutation());
  });

  it("shows a CRM entry pointing at the admin app for a brand owner with CRM access", () => {
    mockAuth({
      state: {
        status: AuthStatus.AUTHENTICATED,
        user: buildUser({ hasCrmAccess: true }),
        accessToken: "token",
      },
      hasCrmAccess: true,
    });

    render(<DashboardSidebar />);

    expect(screen.getByRole("link", { name: "CRM" })).toHaveAttribute("href", "/admin/crm");
  });

  it("hides the CRM entry from a brand owner without CRM access", () => {
    mockAuth({ hasCrmAccess: false });

    render(<DashboardSidebar />);

    expect(screen.queryByRole("link", { name: "CRM" })).not.toBeInTheDocument();
  });
});
