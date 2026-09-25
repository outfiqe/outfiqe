import { cn, LogoMark } from "@outfiqe/design-system";

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

// Mirrors apps/web/src/components/Logo.tsx — admin is a separate origin from the
// marketing site, so off a tenant host the mark links out to the marketing site's
// home page instead of an in-app route. On a tenant's own subdomain, though, this
// same admin bundle sits at <tenant>.<baseDomain>/admin/*, with that tenant's own
// storefront (apps/web) served at the origin root — so the mark should go there
// instead of away to the unrelated marketing site.
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
      <span className={styles.text}>
        <span className="text-primary">out</span>
        <span className="text-secondary">fiqe.</span>
      </span>
    </a>
  );
};
