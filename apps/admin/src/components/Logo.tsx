import { cn } from "@outfiqe/design-system";

import { LogoMark } from "./LogoMark";

const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";

const SIZES = {
  sm: { text: "text-lg", mark: "size-5" },
  md: { text: "text-2xl", mark: "size-7" },
  lg: { text: "text-4xl", mark: "size-10" },
} as const;

type LogoProps = {
  size?: keyof typeof SIZES;
  className?: string;
};

// Mirrors apps/web/src/components/Logo.tsx — admin is a separate origin, so the
// mark links out to the marketing site's home page instead of an in-app route.
export const Logo = ({ size = "md", className }: LogoProps) => {
  const styles = SIZES[size];

  return (
    <a
      href={WEB_URL}
      aria-label="Outfique home"
      className={cn(
        "inline-flex items-center gap-2 font-display font-bold tracking-tight",
        className,
      )}
    >
      <LogoMark className={cn(styles.mark, "shrink-0")} />
      <span className={styles.text}>
        <span className="text-primary">out</span>
        <span className="text-secondary">fiqe.</span>
      </span>
    </a>
  );
};
