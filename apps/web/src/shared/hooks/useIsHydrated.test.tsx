import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useIsHydrated } from "./useIsHydrated";

describe("useIsHydrated", () => {
  it("reports true once running on the client", () => {
    const { result } = renderHook(() => useIsHydrated());
    expect(result.current).toBe(true);
  });
});
