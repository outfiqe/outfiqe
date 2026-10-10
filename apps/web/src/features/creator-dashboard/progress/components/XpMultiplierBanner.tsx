"use client";

import { FormBanner } from "@outfiqe/design-system";

import { useActiveXpMultiplier } from "../hooks/useActiveXpMultiplier";

export const XpMultiplierBanner = () => {
  const { data: activeMultiplier } = useActiveXpMultiplier();
  if (!activeMultiplier) return null;

  const { label, multiplier, endsAt } = activeMultiplier;

  return (
    <FormBanner tone="positive" className="mb-4">
      🔥 {label} — earning {multiplier}x XP until {new Date(endsAt).toLocaleString()}
    </FormBanner>
  );
};
