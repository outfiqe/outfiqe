"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import { setAccessToken, setUnauthorizedHandler } from "@/shared/lib/apiClient";
import { authApi } from "../api/authApi";
import { authReducer, initialAuthState } from "./authReducer";
import { AuthActionType, AuthStatus, UserRole, type AuthAction, type AuthState } from "../types";

// Mirrors the non-httpOnly companion cookie the API sets/clears alongside
// refresh_token (see apps/api/src/shared/utils/cookie.utils.ts).
const HAS_SESSION_COOKIE_NAME = "has_session";

type AuthContextValue = {
  state: AuthState;
  dispatch: Dispatch<AuthAction>;
  isAuthenticated: boolean;
  isBrandOwner: boolean;
  isCreator: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  useEffect(() => {
    setAccessToken(state.accessToken);
  }, [state.accessToken]);

  useEffect(() => {
    setUnauthorizedHandler(() => dispatch({ type: AuthActionType.AUTH_LOGOUT }));

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
    }
  };

  const value: AuthContextValue = {
    state,
    dispatch,
    isAuthenticated: state.status === AuthStatus.AUTHENTICATED,
    isBrandOwner: state.user?.role === UserRole.BRAND_OWNER,
    isCreator: state.user?.isCreator === true,
    logout,
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
