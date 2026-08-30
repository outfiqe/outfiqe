import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAuthMock = vi.fn();
const isOnTenantHostMock = vi.fn();

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/tenantHost", () => ({
  isOnTenantHost: () => isOnTenantHostMock(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

import { AccountMenu } from "./AccountMenu";

const signedIn = (hasPlatformAccess: boolean) => ({
  state: {
    status: "signed-in" as const,
    user: {
      id: "user-1",
      name: "Bikash Shrestha",
      avatarUrl: null,
      hasPlatformAccess,
    },
  },
  logout: vi.fn(),
});

describe("admin AccountMenu", () => {
  beforeEach(() => {
    isOnTenantHostMock.mockReturnValue(true);
  });

  it("offers a storefront profile link to a tenant (non-platform) user", () => {
    useAuthMock.mockReturnValue(signedIn(false));

    render(<AccountMenu />);

    expect(screen.getByRole("link", { name: "Storefront profile" })).toHaveAttribute(
      "href",
      `${window.location.origin}/profile`,
    );
  });

  it("hides the storefront profile link from platform staff", () => {
    useAuthMock.mockReturnValue(signedIn(true));

    render(<AccountMenu />);

    expect(screen.queryByRole("link", { name: "Storefront profile" })).not.toBeInTheDocument();
  });

  it("hides the storefront profile link when the CRM is not on a tenant host", () => {
    isOnTenantHostMock.mockReturnValue(false);
    useAuthMock.mockReturnValue(signedIn(false));

    render(<AccountMenu />);

    expect(screen.queryByRole("link", { name: "Storefront profile" })).not.toBeInTheDocument();
  });
});
