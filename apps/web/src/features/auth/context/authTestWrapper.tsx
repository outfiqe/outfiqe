import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@test/integration/queryClientWrapper";
import { act } from "@testing-library/react";
import type { Dispatch, ReactNode } from "react";

import {
  type AuthAction,
  AuthActionType,
  CreatorStatus,
  UserRole,
  type UserSession,
} from "../types";
import { AuthProvider } from "./AuthContext";

export const createAuthQueryClientWrapper = () => {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  Wrapper.displayName = "AuthQueryClientTestWrapper";

  return Wrapper;
};

export const testUserSession: UserSession = {
  id: "user-1",
  name: "Ava Martinez",
  email: "ava@outfiqe.test",
  avatarUrl: null,
  role: UserRole.CUSTOMER,
  isCreator: false,
  creatorStatus: CreatorStatus.NONE,
};

export const dispatchAuthSuccess = (
  dispatch: Dispatch<AuthAction>,
  user: UserSession = testUserSession,
): void => {
  act(() => {
    dispatch({ type: AuthActionType.AUTH_SUCCESS, payload: { user, accessToken: "access-token" } });
  });
};
