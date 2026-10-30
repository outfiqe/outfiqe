import { cn, LogoMark, LogoWordmark } from "@outfiqe/design-system";

import { isOnTenantHost } from "@/lib/tenantHost";

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

export const Logo = ({ size = "md", className }: LogoProps) => {
  const styles = SIZES[size];
  const homeHref = isOnTenantHost() ? window.location.origin : WEB_URL;

  return (
    <a
      href={homeHref}
      aria-label="Outfique home"
      className={cn(
        "inline-flex items-center gap-2 font-display font-bold tracking-tight",
        className,
      )}
    >
      <LogoMark className={cn(styles.mark, "shrink-0")} />
      <LogoWordmark className={styles.text} />
    </a>
  );
};
