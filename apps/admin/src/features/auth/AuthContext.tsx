import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { setAccessToken, setUnauthorizedHandler } from "@/lib/apiClient";
import { authApi } from "./api";
import type { AdminUser } from "./schemas";

type AuthState =
  { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; user: AdminUser };

type AuthContextValue = {
  state: AuthState;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    setUnauthorizedHandler(() => setState({ status: "signed-out" }));

    const restoreSession = async () => {
      try {
        const { accessToken } = await authApi.refresh();
        setAccessToken(accessToken);
        const user = await authApi.me();
        setState(user.role === "ADMIN" ? { status: "signed-in", user } : { status: "signed-out" });
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

  return <AuthContext.Provider value={{ state, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
