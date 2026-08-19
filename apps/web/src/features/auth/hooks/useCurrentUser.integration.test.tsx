import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAuth } from "../context/AuthContext";
import {
  createAuthQueryClientWrapper,
  dispatchAuthSuccess,
  testUserSession,
} from "../context/authTestWrapper";
import { useCurrentUser } from "./useCurrentUser";

describe("useCurrentUser", () => {
  it("returns null before a session exists", () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createAuthQueryClientWrapper(),
    });

    expect(result.current).toBeNull();
  });

  it("returns the authenticated user once auth state is populated", () => {
    const { result } = renderHook(() => ({ currentUser: useCurrentUser(), auth: useAuth() }), {
      wrapper: createAuthQueryClientWrapper(),
    });

    dispatchAuthSuccess(result.current.auth.dispatch);

    expect(result.current.currentUser).toMatchObject({ id: testUserSession.id });
  });
});
