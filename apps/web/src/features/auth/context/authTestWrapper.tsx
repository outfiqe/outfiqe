import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@test/integration/queryClientWrapper";
import type { ReactNode } from "react";

import { AuthProvider } from "./AuthContext";

export const createAuthQueryClientWrapper = () => {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  Wrapper.displayName = "AuthQueryClientTestWrapper";

  return Wrapper;
};
