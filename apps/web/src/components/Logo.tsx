import Link from "next/link";

import { cn } from "@/shared/lib/cn";

const SIZES = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
} as const;

interface LogoProps {
  size?: keyof typeof SIZES;
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "font-display font-bold tracking-tight text-foreground",
        SIZES[size],
        className,
      )}
    >
      outfiqe
      <span className="text-primary">.</span>
    </Link>
  );
}
