import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/features/auth/AuthContext";

const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { state } = useAuth();

  useEffect(() => {
    if (state.status !== "signed-out") return;
    const redirect = encodeURIComponent(window.location.origin);
    window.location.href = `${WEB_URL}/login?redirect=${redirect}`;
  }, [state.status]);

  if (state.status === "signed-in") return <>{children}</>;

  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
      {state.status === "loading" ? "Loading…" : "Redirecting to sign in…"}
    </div>
  );
}
