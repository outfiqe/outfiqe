import type { SidebarNavItem } from "@outfiqe/components";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayoutGrid, User, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";
import { useChatPanel } from "@/features/messaging";

import { DashboardMobileNavBar } from "./DashboardMobileNavBar";
import { useDashboardMobileNav } from "./useDashboardMobileNav";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn(), useLogout: vi.fn() }));
vi.mock("@/features/messaging", () => ({ useChatPanel: vi.fn() }));
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
  vi.mocked(useLogout).mockReturnValue(buildIdleLogoutMutation());
  vi.mocked(useChatPanel).mockReturnValue({
    isOpen: false,
  } as ReturnType<typeof useChatPanel>);
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

  it("renders nothing while the chat panel is open", () => {
    authenticate();
    vi.mocked(useChatPanel).mockReturnValue({
      isOpen: true,
    } as ReturnType<typeof useChatPanel>);

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

  it("opens a panel with the overflow items, customize and sign out", () => {
    authenticate();
    render(<DashboardMobileNavBar />);

    fireEvent.click(screen.getByRole("button", { name: "Open dashboard menu" }));

    expect(screen.getByRole("link", { name: /Challenges/ })).toHaveAttribute("href", "/challenges");
    expect(screen.getByRole("link", { name: /CRM/ })).toHaveAttribute("href", "/admin/crm");
    expect(screen.getByRole("button", { name: /Customize navigation/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
  });

  it("keeps the pinned bar stacked above the backdrop while the panel is open", () => {
    authenticate();
    render(<DashboardMobileNavBar />);

    fireEvent.click(screen.getByRole("button", { name: "Open dashboard menu" }));

    expect(screen.getByTestId("dashboard-nav-bar")).toHaveClass("z-50");
    expect(screen.getByTestId("dashboard-menu-backdrop")).toHaveClass("z-40");
  });

  it("dims behind the panel with a plain scrim and no backdrop blur", () => {
    authenticate();
    render(<DashboardMobileNavBar />);

    fireEvent.click(screen.getByRole("button", { name: "Open dashboard menu" }));

    const backdrop = screen.getByTestId("dashboard-menu-backdrop");
    expect(backdrop).toHaveClass("bg-black/55");
    expect(backdrop).not.toHaveClass("backdrop-blur-[2px]");
  });

  it("opens the customize sheet from the panel and persists a saved selection", () => {
    authenticate();
    render(<DashboardMobileNavBar />);

    fireEvent.click(screen.getByRole("button", { name: "Open dashboard menu" }));
    fireEvent.click(screen.getByRole("button", { name: /Customize navigation/ }));
    expect(screen.getByTestId("customize-sheet")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "mock-save" }));

    expect(savePins).toHaveBeenCalledWith(["profile", "overview"]);
    expect(screen.queryByTestId("customize-sheet")).not.toBeInTheDocument();
  });

  it("closes the panel when the open/close toggle is pressed again", async () => {
    const user = userEvent.setup();
    authenticate();
    render(<DashboardMobileNavBar />);

    const toggle = screen.getByRole("button", { name: "Open dashboard menu" });
    await user.click(toggle);
    expect(screen.getByRole("link", { name: /Challenges/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close dashboard menu", hidden: true }));

    expect(screen.queryByRole("link", { name: /Challenges/ })).not.toBeInTheDocument();
  });

  it("closes the panel when the backdrop is tapped", () => {
    authenticate();
    render(<DashboardMobileNavBar />);

    fireEvent.click(screen.getByRole("button", { name: "Open dashboard menu" }));
    fireEvent.click(screen.getByTestId("dashboard-menu-backdrop"));

    expect(screen.queryByRole("link", { name: /Challenges/ })).not.toBeInTheDocument();
  });

  it("closes the panel on Escape", () => {
    authenticate();
    render(<DashboardMobileNavBar />);

    fireEvent.click(screen.getByRole("button", { name: "Open dashboard menu" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("link", { name: /Challenges/ })).not.toBeInTheDocument();
  });
});
