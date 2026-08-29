import { type ReactNode, useEffect } from "react";

import { useAuth } from "@/features/auth/AuthContext";

import { resolveLoginOrigin } from "./ProtectedRoute.utils";

const CONFIGURED_WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { state } = useAuth();
  const { status } = state;

  useEffect(() => {
    if (status !== "signed-out") return;
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    const loginOrigin = resolveLoginOrigin(CONFIGURED_WEB_URL, window.location.hostname);
    window.location.href = `${loginOrigin}/login?redirect=${redirect}`;
  }, [status]);

  if (status === "signed-in") return <>{children}</>;

  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
      {status === "loading" ? "Loading…" : "Redirecting to sign in…"}
    </div>
  );
};
