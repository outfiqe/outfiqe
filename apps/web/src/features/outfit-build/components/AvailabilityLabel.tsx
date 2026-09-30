"use client";

import { cn } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";

import type { OutfitProduct } from "../api/outfitSchemas";

const AVAILABILITY_DOT_CLASS: Record<OutfitProduct["availability"], string> = {
  IN_STOCK: "bg-emerald-500",
  LOW_STOCK: "bg-amber-500",
  OUT_OF_STOCK: "bg-destructive",
};

export const AvailabilityLabel = ({
  availability,
  className,
}: {
  availability: OutfitProduct["availability"];
  className?: string;
}) => {
  const t = useTranslations("outfitBuild.availability");

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      <span
        aria-hidden
        className={cn("size-2 rounded-full", AVAILABILITY_DOT_CLASS[availability])}
      />
      {t(availability)}
    </span>
  );
};
