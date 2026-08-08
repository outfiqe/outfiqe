import type { ReactNode } from "react";

export function FormBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="mb-4 rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
    >
      {children}
    </div>
  );
}
