import Link from "next/link";

import { cn } from "@/shared/lib/cn";
import { LogoMark } from "./LogoMark";

const SIZES = {
  sm: { text: "text-lg", mark: "size-5" },
  md: { text: "text-2xl", mark: "size-7" },
  lg: { text: "text-4xl", mark: "size-10" },
} as const;

type LogoProps = {
  size?: keyof typeof SIZES;
  className?: string;
};

export function Logo({ size = "md", className }: LogoProps) {
  const styles = SIZES[size];

  return (
    <Link
      href="/"
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
}
