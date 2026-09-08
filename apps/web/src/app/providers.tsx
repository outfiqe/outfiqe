"use client";

import "@/features/explore/offlineActionHandlers";

import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { type ReactNode, useState } from "react";

import { AuthProvider } from "@/features/auth";
import { GamificationSocketListener } from "@/features/creator-dashboard/components/GamificationSocketListener";
import { ChatPanel, ChatPanelProvider, FloatingChatLauncher } from "@/features/messaging";
import {
  AppBadgeSync,
  AppUpdatePrompt,
  BackgroundRefreshRegistration,
  createQueryPersister,
  InstallPrompt,
  isPwaEnabled,
  OfflineActionSync,
  OfflineBanner,
  PERSISTED_CACHE_MAX_AGE_MS,
  PERSISTED_CACHE_VERSION,
  PersistentStorageRequest,
  PushNotificationPrompt,
  PwaKillSwitchTeardown,
  ServiceWorkerErrorReporter,
  ServiceWorkerProvider,
  shouldPersistQuery,
} from "@/features/pwa";
import { DeferredMount } from "@/shared/components/DeferredMount";

const DEFAULT_STALE_TIME_MS = 30 * 1000;
const INACTIVE_CACHE_RETENTION_MS = 30 * 60 * 1000;

export const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: DEFAULT_STALE_TIME_MS,
            gcTime: INACTIVE_CACHE_RETENTION_MS,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const [persister] = useState(createQueryPersister);

  const app = (
    <AuthProvider>
      <ChatPanelProvider>
        {children}
        <OfflineBanner />
        <OfflineActionSync />
        <ServiceWorkerErrorReporter />
        <PwaKillSwitchTeardown />
        <Toaster />
        <GamificationSocketListener />
        <DeferredMount>
          <AppUpdatePrompt />
          <InstallPrompt />
          <PushNotificationPrompt />
          <PersistentStorageRequest />
          <AppBadgeSync />
          <BackgroundRefreshRegistration />
          <FloatingChatLauncher />
          <ChatPanel />
        </DeferredMount>
      </ChatPanelProvider>
    </AuthProvider>
  );

  return (
    <ServiceWorkerProvider>
      {isPwaEnabled ? (
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: PERSISTED_CACHE_MAX_AGE_MS,
            buster: PERSISTED_CACHE_VERSION,
            dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
          }}
        >
          {app}
        </PersistQueryClientProvider>
      ) : (
        <QueryClientProvider client={queryClient}>{app}</QueryClientProvider>
      )}
    </ServiceWorkerProvider>
  );
};
