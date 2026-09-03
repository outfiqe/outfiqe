import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus, CreatorStatus, UserRole, type UserSession } from "@/features/auth/types";
import { useTenantHost } from "@/shared/hooks/useTenantHost";

import { DashboardSidebar } from "./DashboardSidebar";

vi.mock("@/features/auth", () => ({
  useAuth: vi.fn(),
  useLogout: vi.fn(),
}));

vi.mock("@/shared/hooks/useTenantHost", () => ({
  useTenantHost: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onNavigate: _onNavigate,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string | { pathname: string };
    children: ReactNode;
    onNavigate?: () => void;
    prefetch?: boolean;
  }) => (
    <a href={typeof href === "string" ? href : href.pathname} {...rest}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
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
    vi.mocked(useTenantHost).mockReturnValue(true);
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

  it("hides the CRM entry when the storefront is not on a tenant host", () => {
    vi.mocked(useTenantHost).mockReturnValue(false);
    mockAuth({
      state: {
        status: AuthStatus.AUTHENTICATED,
        user: buildUser({ hasCrmAccess: true }),
        accessToken: "token",
      },
      hasCrmAccess: true,
    });

    render(<DashboardSidebar />);

    expect(screen.queryByRole("link", { name: "CRM" })).not.toBeInTheDocument();
  });

  it("hides Share, Earnings and Withdraw from a shopper who is not an approved creator", () => {
    mockAuth({
      state: {
        status: AuthStatus.AUTHENTICATED,
        user: buildUser({ role: UserRole.CUSTOMER, isCreator: false }),
        accessToken: "token",
      },
      isBrandOwner: false,
      isCreator: false,
    });

    render(<DashboardSidebar />);

    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Share" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Earnings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Withdraw" })).not.toBeInTheDocument();
  });

  it("shows Share, Earnings and Withdraw to an approved creator", () => {
    mockAuth({
      state: {
        status: AuthStatus.AUTHENTICATED,
        user: buildUser({
          role: UserRole.CUSTOMER,
          isCreator: true,
          creatorStatus: CreatorStatus.APPROVED,
        }),
        accessToken: "token",
      },
      isBrandOwner: false,
      isCreator: true,
    });

    render(<DashboardSidebar />);

    expect(screen.getByRole("link", { name: "Share" })).toHaveAttribute("href", "/share");
    expect(screen.getByRole("link", { name: "Earnings" })).toHaveAttribute("href", "/earnings");
    expect(screen.getByRole("link", { name: "Withdraw" })).toHaveAttribute("href", "/withdraw");
  });
});
