import { Loader2 } from "lucide-react";
import { type ReactNode, useEffect } from "react";

import { useAuth } from "@/features/auth/AuthContext";

import { resolveLoginOrigin } from "./ProtectedRoute.utils";

const CONFIGURED_WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { state } = useAuth();
  const { status } = state;
  const signedOutReason = state.status === "signed-out" ? state.reason : null;

  useEffect(() => {
    if (status !== "signed-out") return;
    const loginOrigin = resolveLoginOrigin(CONFIGURED_WEB_URL, window.location.hostname);
    const returnQuery =
      signedOutReason === "user-signed-out"
        ? ""
        : `?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = `${loginOrigin}/login${returnQuery}`;
  }, [status, signedOutReason]);

  if (status === "signed-in") return <>{children}</>;

  return (
    <div
      role="status"
      className="flex min-h-dvh items-center justify-center gap-3 bg-background text-sm text-foreground"
    >
      <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
      {status === "loading" ? "Loading…" : "Redirecting to sign in…"}
    </div>
  );
};
