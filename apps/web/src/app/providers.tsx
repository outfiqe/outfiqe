"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// QueryClient must be created inside a Client Component (not at module scope)
// so each request gets its own instance during SSR instead of sharing state
// across requests. useState (not useMemo) guarantees it's created exactly
// once per component instance and never recreated on re-render.
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
