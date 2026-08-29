import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { setAccessToken, setUnauthorizedHandler } from "@/lib/apiClient";

import { authApi } from "./api";
import type { AdminUser } from "./schemas";

const canAccessAdminApp = (role: AdminUser["role"]): boolean =>
  role === "ADMIN" || role === "BRAND_OWNER";

type AuthState =
  { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; user: AdminUser };

type AuthContextValue = {
  state: AuthState;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<AdminUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    setUnauthorizedHandler(() => setState({ status: "signed-out" }));

    const restoreSession = async () => {
      try {
        const { accessToken } = await authApi.refresh();
        setAccessToken(accessToken);
        const user = await authApi.me();
        setState(
          canAccessAdminApp(user.role) ? { status: "signed-in", user } : { status: "signed-out" },
        );
      } catch {
        setState({ status: "signed-out" });
      }
    };

    restoreSession();
    return () => setUnauthorizedHandler(null);
  }, []);

  const logout = async () => {
    await authApi.logout().catch(() => {});
    setAccessToken(null);
    setState({ status: "signed-out" });
  };

  const updateUser = useCallback((patch: Partial<AdminUser>) => {
    setState((prev) =>
      prev.status === "signed-in" ? { ...prev, user: { ...prev.user, ...patch } } : prev,
    );
  }, []);

  return (
    <AuthContext.Provider value={{ state, logout, updateUser }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
