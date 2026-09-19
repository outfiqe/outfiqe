import { Loader2 } from "lucide-react";

export const RoutePendingScreen = () => (
  <div role="status" className="flex min-h-dvh items-center justify-center bg-background">
    <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
    <span className="sr-only">Loading page</span>
  </div>
);
