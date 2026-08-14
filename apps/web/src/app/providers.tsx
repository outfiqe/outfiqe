"use client";

import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

import { AuthProvider } from "@/features/auth";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
