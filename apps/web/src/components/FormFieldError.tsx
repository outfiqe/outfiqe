import type { ReactNode } from "react";

export function FormFieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
      {children}
    </p>
  );
}
