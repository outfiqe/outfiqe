import { Loader2 } from "lucide-react";

export const RedirectingToLogin = () => (
  <div
    role="status"
    className="flex min-h-dvh items-center justify-center gap-3 bg-background text-sm text-foreground"
  >
    <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
    Redirecting to login…
  </div>
);
