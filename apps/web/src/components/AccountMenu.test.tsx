import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus, CreatorStatus, UserRole, type UserSession } from "@/features/auth/types";
import { ADMIN_URL } from "@/features/auth/utils/getDefaultRoute";

import { AccountMenu } from "./AccountMenu";

vi.mock("@/features/auth", () => ({
  useAuth: vi.fn(),
  useLogout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const buildUser = (overrides: Partial<UserSession> = {}): UserSession => ({
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@outfiqe.test",
  avatarUrl: null,
  role: UserRole.CUSTOMER,
  isCreator: false,
  creatorStatus: CreatorStatus.NONE,
  ...overrides,
});

const mockAuth = (overrides: Partial<ReturnType<typeof useAuth>>) => {
  vi.mocked(useAuth).mockReturnValue({
    state: { status: AuthStatus.UNAUTHENTICATED, user: null, accessToken: null },
    isAuthenticated: false,
    isAuthResolved: true,
    isBrandOwner: false,
    isAdmin: false,
    isCreator: false,
    dispatch: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAuth>);
};

describe("AccountMenu", () => {
  beforeEach(() => {
    vi.mocked(useLogout).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as ReturnType<typeof useLogout>);
  });

  it("renders a skeleton placeholder, not empty space, while the session is still resolving", () => {
    mockAuth({
      state: { status: AuthStatus.LOADING, user: null, accessToken: null },
      isAuthResolved: false,
    });

    const { container } = render(<AccountMenu />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("links a signed-in creator's avatar and Dashboard entry to their profile", () => {
    const user = buildUser();
    mockAuth({
      state: { status: AuthStatus.AUTHENTICATED, user, accessToken: "token" },
      isAuthenticated: true,
    });

    render(<AccountMenu />);

    const profileLinks = screen.getAllByRole("link", { name: /Your account|Dashboard/ });
    expect(profileLinks.every((link) => link.getAttribute("href") === "/profile")).toBe(true);
  });

  it("sends an admin straight to the admin app instead of the creator/business dashboard", () => {
    const admin = buildUser({ role: UserRole.ADMIN });
    mockAuth({
      state: { status: AuthStatus.AUTHENTICATED, user: admin, accessToken: "token" },
      isAuthenticated: true,
      isAdmin: true,
    });

    render(<AccountMenu />);

    expect(screen.queryByRole("link", { name: "Brand dashboard" })).not.toBeInTheDocument();
    const adminLinks = screen.getAllByRole("link", { name: "Dashboard" });
    expect(adminLinks).toHaveLength(2);
    for (const link of adminLinks) {
      expect(link).toHaveAttribute("href", ADMIN_URL);
    }
  });
});
