import { LogoMark } from "@outfiqe/design-system";
import Link from "next/link";

import { cn } from "@/shared/lib/cn";

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

  return (
    <Link
      href="/"
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
    </Link>
  );
};
