"use client";

import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

import { AuthProvider } from "@/features/auth";
import { GamificationSocketListener } from "@/features/creator-dashboard/components/GamificationSocketListener";
import { ChatPanel, ChatPanelProvider, FloatingChatLauncher } from "@/features/messaging";
import { ServiceWorkerProvider } from "@/features/pwa";

const DEFAULT_STALE_TIME_MS = 30 * 1000;

export const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: DEFAULT_STALE_TIME_MS,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ServiceWorkerProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ChatPanelProvider>
            {children}
            <Toaster />
            <GamificationSocketListener />
            <FloatingChatLauncher />
            <ChatPanel />
          </ChatPanelProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ServiceWorkerProvider>
  );
};
