import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReducedMotion } from "framer-motion";
import { Shield, User, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";

import { DashboardMobileMenu, shouldDismissOnSwipe } from "./DashboardMobileMenu";
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
vi.mock("framer-motion", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useReducedMotion: vi.fn(() => false) };
});

const buildIdleLogoutMutation = (): ReturnType<typeof useLogout> => ({
  context: undefined,
  data: undefined,
  error: null,
  failureCount: 0,
  failureReason: null,
  isError: false,
  isIdle: true,
  isPending: false,
  isPaused: false,
  isSuccess: false,
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  status: "idle",
  submittedAt: 0,
  variables: undefined,
});

const buildPendingLogoutMutation = (): ReturnType<typeof useLogout> => ({
  context: undefined,
  data: undefined,
  error: null,
  failureCount: 0,
  failureReason: null,
  isError: false,
  isIdle: false,
  isPending: true,
  isPaused: false,
  isSuccess: false,
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  status: "pending",
  submittedAt: 0,
  variables: undefined,
});

const authenticateAsCreator = () => {
  vi.mocked(useAuth).mockReturnValue({
    state: {
      status: AuthStatus.AUTHENTICATED,
      user: { id: "u1", name: "Sabin" },
      accessToken: "t",
    },
  } as ReturnType<typeof useAuth>);
};

beforeEach(() => {
  vi.mocked(useReducedMotion).mockReturnValue(false);
  vi.mocked(useLogout).mockReturnValue(buildIdleLogoutMutation());
  vi.mocked(useDashboardNav).mockReturnValue({
    navItems: [
      { id: "profile", href: "/profile", label: "Profile", icon: User },
      { id: "earnings", href: "/earnings", label: "Earnings", icon: Wallet },
      { id: "admin", href: "/admin/dashboard", label: "Admin", icon: Shield },
    ],
    isBrand: false,
    accountLabel: "Creator account",
  });
});

describe("DashboardMobileMenu", () => {
  it("renders nothing until auth resolves", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: AuthStatus.LOADING, user: null, accessToken: null },
    } as ReturnType<typeof useAuth>);

    const { container } = render(<DashboardMobileMenu />);

    expect(container).toBeEmptyDOMElement();
  });

  it("opens a panel of nav links from the menu button", async () => {
    authenticateAsCreator();
    render(<DashboardMobileMenu />);
    const user = userEvent.setup();

    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open dashboard menu" }));

    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: "Earnings" })).toHaveAttribute("href", "/earnings");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("renders a cross-app nav target as a full-navigation anchor", async () => {
    authenticateAsCreator();
    render(<DashboardMobileMenu />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Open dashboard menu" }));

    const adminLink = screen.getByRole("link", { name: "Admin" });
    expect(adminLink).toHaveAttribute("href", "/admin/dashboard");
    expect(adminLink).not.toHaveAttribute("aria-current");
  });

  it("closes the panel when the backdrop is tapped", async () => {
    authenticateAsCreator();
    vi.mocked(useReducedMotion).mockReturnValue(true);
    render(<DashboardMobileMenu />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Open dashboard menu" }));
    await user.click(screen.getByRole("button", { name: "Close menu" }));

    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
  });

  it("shows a pending state while signing out", async () => {
    authenticateAsCreator();
    vi.mocked(useLogout).mockReturnValue(buildPendingLogoutMutation());
    render(<DashboardMobileMenu />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Open dashboard menu" }));

    expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
  });

  it("still renders the menu when reduced motion is preferred", async () => {
    authenticateAsCreator();
    vi.mocked(useReducedMotion).mockReturnValue(true);
    render(<DashboardMobileMenu />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Open dashboard menu" }));

    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
  });
});

describe("shouldDismissOnSwipe", () => {
  it("dismisses on a long drag toward the edge", () => {
    expect(shouldDismissOnSwipe(120, 0)).toBe(true);
  });

  it("dismisses on a fast fling toward the edge", () => {
    expect(shouldDismissOnSwipe(10, 900)).toBe(true);
  });

  it("keeps the drawer open for a small, slow drag", () => {
    expect(shouldDismissOnSwipe(20, 100)).toBe(false);
  });
});
