import { ShieldAlert } from "lucide-react";

export const ImpersonationLinkExpired = () => (
  <div
    role="status"
    className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-sm text-foreground"
  >
    <ShieldAlert className="size-6 text-muted-foreground" aria-hidden="true" />
    <p className="font-medium">This support link has expired or was already used.</p>
    <p className="text-muted-foreground">
      Ask the platform admin to open a new one from the Impersonation page.
    </p>
  </div>
);
