import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  rememberViewerIsStaff,
  STAFF_VIEWER_HINT_KEY,
  useStaffViewerHint,
} from "./staffViewerHint";

afterEach(() => {
  localStorage.clear();
});

describe("staffViewerHint", () => {
  it("is off for a browser that has never had an admin sign in", () => {
    const { result } = renderHook(() => useStaffViewerHint());

    expect(result.current).toBe(false);
  });

  it("turns on after an admin signs in and off again when someone else does", () => {
    rememberViewerIsStaff(true);
    expect(localStorage.getItem(STAFF_VIEWER_HINT_KEY)).not.toBeNull();
    expect(renderHook(() => useStaffViewerHint()).result.current).toBe(true);

    rememberViewerIsStaff(false);
    expect(localStorage.getItem(STAFF_VIEWER_HINT_KEY)).toBeNull();
    expect(renderHook(() => useStaffViewerHint()).result.current).toBe(false);
  });
});
