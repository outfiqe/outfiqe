import type { SidebarNavItem } from "@outfiqe/components";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReducedMotion } from "framer-motion";
import { LayoutGrid, User, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";

import { DashboardMobileNavBar } from "./DashboardMobileNavBar";
import { useDashboardMobileNav } from "./useDashboardMobileNav";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn(), useLogout: vi.fn() }));
vi.mock("./useDashboardMobileNav", () => ({ useDashboardMobileNav: vi.fn() }));
vi.mock("./DashboardNavCustomizeSheet", () => ({
  DashboardNavCustomizeSheet: ({
    onSave,
    onReset,
    onClose,
  }: {
    onSave: (ids: string[]) => void;
    onReset: () => void;
    onClose: () => void;
  }) => (
    <div data-testid="customize-sheet">
      <button type="button" onClick={() => onSave(["profile", "overview"])}>
        mock-save
      </button>
      <button type="button" onClick={onReset}>
        mock-reset
      </button>
      <button type="button" onClick={onClose}>
        mock-close
      </button>
    </div>
  ),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/overview" }));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));
vi.mock("framer-motion", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useReducedMotion: vi.fn(() => false) };
});

const navItem = (id: string, label: string, href: string): SidebarNavItem => ({
  id,
  label,
  href,
  icon: User,
});

const pinnedItems = [
  navItem("overview", "Overview", "/overview"),
  navItem("profile", "Profile", "/profile"),
  { ...navItem("progress", "Progress", "/progress"), icon: Wallet },
  { ...navItem("badges", "Badges", "/badges"), icon: Wallet },
];
const overflowItems = [
  navItem("challenges", "Challenges", "/challenges"),
  { id: "crm", label: "CRM", href: "/admin/crm", icon: LayoutGrid },
];

const savePins = vi.fn();
const resetPins = vi.fn();

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

const authenticate = () => {
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
  vi.mocked(useDashboardMobileNav).mockReturnValue({
    pinnedItems,
    overflowItems,
    allItems: [...pinnedItems, ...overflowItems],
    savePins,
    resetPins,
    accountLabel: "Creator account",
  });
});

describe("DashboardMobileNavBar", () => {
  it("renders nothing until auth resolves", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: AuthStatus.LOADING, user: null, accessToken: null },
    } as ReturnType<typeof useAuth>);

    const { container } = render(<DashboardMobileNavBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the four pinned items as links with the current one marked", () => {
    authenticate();
    render(<DashboardMobileNavBar />);

    expect(screen.getByRole("link", { name: /Overview/ })).toHaveAttribute("href", "/overview");
    expect(screen.getByRole("link", { name: /Overview/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Profile/ })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: /Badges/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Challenges/ })).not.toBeInTheDocument();
  });

  it("opens a panel with the overflow items, customize and sign out", async () => {
    authenticate();
    render(<DashboardMobileNavBar />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Open dashboard menu" }));

    expect(screen.getByRole("link", { name: /Challenges/ })).toHaveAttribute("href", "/challenges");
    expect(screen.getByRole("link", { name: /CRM/ })).toHaveAttribute("href", "/admin/crm");
    expect(screen.getByRole("button", { name: /Customize navigation/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
  });

  it("opens the customize sheet from the panel and persists a saved selection", async () => {
    authenticate();
    render(<DashboardMobileNavBar />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Open dashboard menu" }));
    await user.click(screen.getByRole("button", { name: /Customize navigation/ }));
    expect(screen.getByTestId("customize-sheet")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "mock-save" }));

    expect(savePins).toHaveBeenCalledWith(["profile", "overview"]);
    expect(screen.queryByTestId("customize-sheet")).not.toBeInTheDocument();
  });

  it("closes the panel when the backdrop is tapped", async () => {
    authenticate();
    vi.mocked(useReducedMotion).mockReturnValue(true);
    render(<DashboardMobileNavBar />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Open dashboard menu" }));
    await user.click(screen.getByRole("button", { name: "Close menu" }));

    expect(screen.queryByRole("link", { name: /Challenges/ })).not.toBeInTheDocument();
  });

  it("still renders with reduced motion", async () => {
    authenticate();
    vi.mocked(useReducedMotion).mockReturnValue(true);
    render(<DashboardMobileNavBar />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Open dashboard menu" }));
    expect(screen.getByRole("link", { name: /Challenges/ })).toBeInTheDocument();
  });
});
