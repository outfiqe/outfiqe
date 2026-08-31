import "./index.css";

import { Toaster } from "@outfiqe/design-system";
import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AuthProvider } from "./features/auth/AuthContext.tsx";
import { APP_ENV } from "./lib/appEnv";
import { routeTree } from "./routeTree.gen";

// Without a staleTime, every route remount and window refocus refetches — the default
// QueryClient() has staleTime 0, which was causing the delivery-zones page (and others) to
// hit the API repeatedly on normal navigation.
const ADMIN_QUERY_STALE_TIME_MS = 30 * 1000;
const SENTRY_TRACES_SAMPLE_RATE = 0.2;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ADMIN_QUERY_STALE_TIME_MS,
    },
  },
});
const router = createRouter({ routeTree, basepath: "/admin" });

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: APP_ENV,
    integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
