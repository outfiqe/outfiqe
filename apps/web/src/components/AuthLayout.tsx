import type { ReactNode } from "react";

import { Logo } from "./Logo";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10 sm:py-16">
      <Logo size="lg" />
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 sm:p-8">
        {children}
      </div>
    </div>
  );
}
