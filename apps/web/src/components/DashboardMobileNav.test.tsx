import { render, screen } from "@testing-library/react";
import { User, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";

import { DashboardMobileNav } from "./DashboardMobileNav";
import { useDashboardNav } from "./useDashboardNav";

vi.mock("@/features/auth", () => ({
  useAuth: vi.fn(),
  useLogout: vi.fn(),
}));
vi.mock("./useDashboardNav", () => ({
  useDashboardNav: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

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

beforeEach(() => {
  vi.mocked(useLogout).mockReturnValue(buildIdleLogoutMutation());
  vi.mocked(useDashboardNav).mockReturnValue({
    navItems: [
      { id: "profile", href: "/profile", label: "Profile", icon: User },
      { id: "earnings", href: "/earnings", label: "Earnings", icon: Wallet },
    ],
    isBrand: false,
    accountLabel: "Creator account",
  });
});

describe("DashboardMobileNav", () => {
  it("renders nothing until auth resolves", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: AuthStatus.LOADING, user: null, accessToken: null },
    } as ReturnType<typeof useAuth>);

    const { container } = render(<DashboardMobileNav />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders a nav link per dashboard item plus sign out", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: AuthStatus.AUTHENTICATED,
        user: { id: "u1", name: "Sabin" },
        accessToken: "t",
      },
    } as ReturnType<typeof useAuth>);

    render(<DashboardMobileNav />);

    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: "Earnings" })).toHaveAttribute("href", "/earnings");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
