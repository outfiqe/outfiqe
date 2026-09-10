import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";
import { UserRole } from "@/features/auth/types";
import { useTenantHost } from "@/shared/hooks/useTenantHost";

import { useDashboardNav } from "./useDashboardNav";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/shared/hooks/useTenantHost", () => ({ useTenantHost: vi.fn() }));

const mockAuth = (role: UserRole, isCreator = false) => {
  vi.mocked(useAuth).mockReturnValue({
    state: { user: { role } },
    hasCrmAccess: false,
    isCreator,
  } as ReturnType<typeof useAuth>);
};

beforeEach(() => {
  vi.mocked(useTenantHost).mockReturnValue(false);
});

describe("useDashboardNav", () => {
  it("does not offer the Addresses section to a brand-owner account", () => {
    mockAuth(UserRole.BRAND_OWNER);

    const { result } = renderHook(() => useDashboardNav());

    expect(result.current.isBrand).toBe(true);
    expect(result.current.navItems.map((item) => item.id)).not.toContain("addresses");
  });

  it("keeps the Addresses section for a shopper account", () => {
    mockAuth(UserRole.CUSTOMER);

    const { result } = renderHook(() => useDashboardNav());

    expect(result.current.navItems.map((item) => item.id)).toContain("addresses");
  });
});
