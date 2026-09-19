import { LogoMark } from "@outfiqe/design-system";

const DEFAULT_LOADING_LABEL = "Loading page";

type RoutePendingScreenProps = {
  label?: string;
};

export const RoutePendingScreen = ({ label = DEFAULT_LOADING_LABEL }: RoutePendingScreenProps) => (
  <div role="status" className="flex min-h-dvh items-center justify-center bg-background">
    <LogoMark className="size-[72px] animate-pulse motion-reduce:animate-none" />
    <span className="sr-only">{label}</span>
  </div>
);
