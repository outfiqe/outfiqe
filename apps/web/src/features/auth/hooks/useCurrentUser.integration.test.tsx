import { mockNextRouter } from "@test/integration/mockRouter";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "../context/AuthContext";
import {
  createAuthQueryClientWrapper,
  dispatchAuthSuccess,
  testUserSession,
} from "../context/authTestWrapper";
import { useCurrentUser } from "./useCurrentUser";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

beforeEach(() => {
  mockNextRouter();
});

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
