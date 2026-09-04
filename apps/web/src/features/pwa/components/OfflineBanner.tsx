"use client";

import { useIsOnline } from "../hooks/useIsOnline";

export const OfflineBanner = () => {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 bg-foreground px-4 py-2 text-center text-xs font-medium text-background"
    >
      You&apos;re offline — showing saved content
    </div>
  );
};
