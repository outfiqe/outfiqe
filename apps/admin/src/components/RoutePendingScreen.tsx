import { Loader2 } from "lucide-react";

const DEFAULT_LOADING_LABEL = "Loading page";

type RoutePendingScreenProps = {
  label?: string;
};

export const RoutePendingScreen = ({ label = DEFAULT_LOADING_LABEL }: RoutePendingScreenProps) => (
  <div role="status" className="flex min-h-dvh items-center justify-center bg-background">
    <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
    <span className="sr-only">{label}</span>
  </div>
);
