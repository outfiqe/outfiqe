import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => ({ push }),
}));

import { useNextSidebarNavigation } from "./useNextSidebarNavigation";

const assign = vi.fn();

describe("useNextSidebarNavigation", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { ...window.location, assign });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("client-routes a relative storefront href", () => {
    const { result } = renderHook(() => useNextSidebarNavigation());

    result.current.navigate("/wallet");

    expect(push).toHaveBeenCalledWith("/wallet");
    expect(assign).not.toHaveBeenCalled();
  });

  it("hard-navigates to the admin app for a cross-app href", () => {
    const { result } = renderHook(() => useNextSidebarNavigation());

    result.current.navigate("/admin/crm");

    expect(assign).toHaveBeenCalledWith("/admin/crm");
    expect(push).not.toHaveBeenCalled();
  });

  it("hard-navigates to an absolute URL", () => {
    const { result } = renderHook(() => useNextSidebarNavigation());

    result.current.navigate("https://outfiqe.test/somewhere");

    expect(assign).toHaveBeenCalledWith("https://outfiqe.test/somewhere");
    expect(push).not.toHaveBeenCalled();
  });
});
