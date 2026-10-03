import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";
import { UserRole } from "@/features/auth/types";
import { useCommissionEligibility } from "@/features/creator-dashboard/hooks/useCommissionEligibility";
import { useFeatureFlag } from "@/shared/hooks/useFeatureFlag";
import { useTenantHost } from "@/shared/hooks/useTenantHost";

import { useDashboardNav } from "./useDashboardNav";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/shared/hooks/useTenantHost", () => ({ useTenantHost: vi.fn() }));
vi.mock("@/shared/hooks/useFeatureFlag", () => ({ useFeatureFlag: vi.fn() }));
vi.mock("@/features/creator-dashboard/hooks/useCommissionEligibility", () => ({
  useCommissionEligibility: vi.fn(),
}));

const mockAuth = (role: UserRole, isCreator = false) => {
  vi.mocked(useAuth).mockReturnValue({
    state: { user: { role } },
    hasCrmAccess: false,
    isCreator,
  } as ReturnType<typeof useAuth>);
};

const navIdsFor = (role: UserRole) => {
  mockAuth(role);
  const { result } = renderHook(() => useDashboardNav());
  return result.current.navItems.map((item) => item.id);
};

beforeEach(() => {
  vi.mocked(useTenantHost).mockReturnValue(false);
  vi.mocked(useFeatureFlag).mockReturnValue(false);
  vi.mocked(useCommissionEligibility).mockReturnValue({ canEarn: false });
});

describe("useDashboardNav", () => {
  it("does not offer the Addresses section to a brand-owner account", () => {
    mockAuth(UserRole.BRAND_OWNER);

    const { result } = renderHook(() => useDashboardNav());

    expect(result.current.isBrand).toBe(true);
    expect(result.current.navItems.map((item) => item.id)).not.toContain("addresses");
  });

  it("keeps the Addresses section for a shopper account", () => {
    expect(navIdsFor(UserRole.CUSTOMER)).toContain("addresses");
  });

  it("offers the Language settings to every kind of account", () => {
    expect(navIdsFor(UserRole.CUSTOMER)).toContain("language");
    expect(navIdsFor(UserRole.BRAND_OWNER)).toContain("language");
  });

  it("offers My sizes to shoppers and creators but not to brand accounts", () => {
    expect(navIdsFor(UserRole.CUSTOMER)).toContain("sizes");
    expect(navIdsFor(UserRole.BRAND_OWNER)).not.toContain("sizes");
  });

  it("hides My Builds while Outfit Build is switched off for the person", () => {
    expect(navIdsFor(UserRole.CUSTOMER)).not.toContain("builds");
  });

  it("shows My Builds right after Overview once Outfit Build is on for the person", () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true);

    const [firstNavId, secondNavId] = navIdsFor(UserRole.CUSTOMER);

    expect(useFeatureFlag).toHaveBeenCalledWith("outfit_builder");
    expect([firstNavId, secondNavId]).toEqual(["overview", "builds"]);
  });

  it("keeps Earnings and Withdraw away from shoppers who haven't earned anything", () => {
    const navIds = navIdsFor(UserRole.CUSTOMER);

    expect(navIds).not.toContain("earnings");
    expect(navIds).not.toContain("withdraw");
  });

  it("offers Earnings and Withdraw, but not Share, to a shopper who earned from a build", () => {
    vi.mocked(useCommissionEligibility).mockReturnValue({ canEarn: true });

    const navIds = navIdsFor(UserRole.CUSTOMER);

    expect(navIds).toContain("earnings");
    expect(navIds).toContain("withdraw");
    expect(navIds).not.toContain("share");
  });
});
