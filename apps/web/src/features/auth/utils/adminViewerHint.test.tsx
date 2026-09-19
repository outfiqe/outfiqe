import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  ADMIN_VIEWER_HINT_KEY,
  rememberViewerIsAdmin,
  useAdminViewerHint,
} from "./adminViewerHint";

afterEach(() => {
  localStorage.clear();
});

describe("adminViewerHint", () => {
  it("is off for a browser that has never had an admin sign in", () => {
    const { result } = renderHook(() => useAdminViewerHint());

    expect(result.current).toBe(false);
  });

  it("turns on after an admin signs in and off again when someone else does", () => {
    rememberViewerIsAdmin(true);
    expect(localStorage.getItem(ADMIN_VIEWER_HINT_KEY)).not.toBeNull();
    expect(renderHook(() => useAdminViewerHint()).result.current).toBe(true);

    rememberViewerIsAdmin(false);
    expect(localStorage.getItem(ADMIN_VIEWER_HINT_KEY)).toBeNull();
    expect(renderHook(() => useAdminViewerHint()).result.current).toBe(false);
  });
});
