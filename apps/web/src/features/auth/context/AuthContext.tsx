"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
} from "react";

import { clearCachedContent } from "@/features/pwa/utils/clearCachedContent";
import { setAccessToken, setUnauthorizedHandler } from "@/shared/lib/apiClient";

import { authApi } from "../api/authApi";
import {
  type AuthAction,
  AuthActionType,
  type AuthState,
  AuthStatus,
  UserRole,
  type UserSession,
} from "../types";
import { authReducer, initialAuthState } from "./authReducer";

// Mirrors the non-httpOnly companion cookie the API sets/clears alongside
// refresh_token (see apps/api/src/shared/utils/cookie.utils.ts).
const HAS_SESSION_COOKIE_NAME = "has_session";

type AuthContextValue = {
  state: AuthState;
  dispatch: Dispatch<AuthAction>;
  isAuthenticated: boolean;
  isAuthResolved: boolean;
  isBrandOwner: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  hasCrmAccess: boolean;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<UserSession>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  useEffect(() => {
    setAccessToken(state.accessToken);
  }, [state.accessToken]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch({ type: AuthActionType.AUTH_LOGOUT });
      void clearCachedContent();
    });

    let cancelled = false;

    // refresh_token is httpOnly, so this non-secret companion cookie is the
    // only way to know a session might exist without a doomed 401 round trip.
    if (document.cookie.includes(`${HAS_SESSION_COOKIE_NAME}=1`)) {
      dispatch({ type: AuthActionType.AUTH_LOADING });

      (async () => {
        try {
          const { accessToken } = await authApi.refresh();
          setAccessToken(accessToken);
          const user = await authApi.getCurrentUser();
          if (cancelled) return;
          dispatch({ type: AuthActionType.AUTH_SUCCESS, payload: { user, accessToken } });
        } catch {
          if (cancelled) return;
          dispatch({ type: AuthActionType.AUTH_LOGOUT });
        }
      })();
    } else {
      dispatch({ type: AuthActionType.AUTH_LOGOUT });
    }

    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, []);

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      dispatch({ type: AuthActionType.AUTH_LOGOUT });
      await clearCachedContent();
    }
  };

  const updateUser = (patch: Partial<UserSession>): void => {
    dispatch({ type: AuthActionType.USER_UPDATED, payload: { user: patch } });
  };

  const value: AuthContextValue = {
    state,
    dispatch,
    isAuthenticated: state.status === AuthStatus.AUTHENTICATED,
    isAuthResolved:
      state.status === AuthStatus.AUTHENTICATED || state.status === AuthStatus.UNAUTHENTICATED,
    isBrandOwner: state.user?.role === UserRole.BRAND_OWNER,
    isAdmin: state.user?.role === UserRole.ADMIN,
    isCreator: state.user?.isCreator === true,
    hasCrmAccess: state.user?.hasCrmAccess === true,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
};
