import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";
import { useCart } from "@/features/cart";

import { MobileNav } from "./MobileNav";

vi.mock("@/features/auth", () => ({
  useAuth: vi.fn(),
  useLogout: vi.fn(),
}));

vi.mock("@/features/cart", () => ({
  useCart: vi.fn(),
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

const mockAuth = (overrides: Partial<ReturnType<typeof useAuth>> = {}) => {
  vi.mocked(useAuth).mockReturnValue({
    state: { status: AuthStatus.UNAUTHENTICATED, user: null, accessToken: null },
    isAuthenticated: false,
    isAuthResolved: true,
    isAdmin: false,
    isBrandOwner: false,
    isCreator: false,
    hasCrmAccess: false,
    dispatch: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAuth>);
};

const openMenu = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
};

describe("MobileNav", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    vi.mocked(useLogout).mockReturnValue(buildIdleLogoutMutation());
    vi.mocked(useCart).mockReturnValue({ data: { itemCount: 0 } } as ReturnType<typeof useCart>);
    mockAuth();
  });

  it("moves wishlist, bag, and the theme toggle into the drawer", async () => {
    render(<MobileNav />);
    await openMenu();

    expect(screen.getByRole("link", { name: /wishlist/i })).toHaveAttribute("href", "/wishlist");
    expect(screen.getByRole("link", { name: /bag/i })).toHaveAttribute("href", "/cart");
    expect(
      screen.getByRole("button", { name: /switch to (light|dark) mode/i }),
    ).toBeInTheDocument();
  });

  it("no longer renders a search field inside the drawer", async () => {
    render(<MobileNav />);
    await openMenu();

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
  });

  it("shows the bag count when the cart has items", async () => {
    vi.mocked(useCart).mockReturnValue({ data: { itemCount: 3 } } as ReturnType<typeof useCart>);
    render(<MobileNav />);
    await openMenu();

    const bagLink = screen.getByRole("link", { name: /bag/i });
    expect(bagLink).toHaveTextContent("3");
  });

  it("gives a signed-in creator a labelled account link to their space", async () => {
    mockAuth({
      state: {
        status: AuthStatus.AUTHENTICATED,
        user: { id: "u1", name: "Sabin Shrestha", avatarUrl: null },
        accessToken: "t",
      },
      isAuthenticated: true,
      isCreator: true,
    } as Partial<ReturnType<typeof useAuth>>);
    render(<MobileNav />);
    await openMenu();

    const accountLink = screen.getByRole("link", { name: /Sabin Shrestha/ });
    expect(accountLink).toHaveAttribute("href", "/overview");
    expect(accountLink).toHaveTextContent("Your creator space");
  });

  it("sends a signed-in admin to the admin console", async () => {
    mockAuth({
      state: {
        status: AuthStatus.AUTHENTICATED,
        user: { id: "a1", name: "Platform Admin", avatarUrl: null, role: "ADMIN" },
        accessToken: "t",
      },
      isAuthenticated: true,
      isAdmin: true,
    } as Partial<ReturnType<typeof useAuth>>);
    render(<MobileNav />);
    await openMenu();

    expect(screen.getByRole("link", { name: /Platform Admin/ })).toHaveTextContent("Admin console");
  });
});
