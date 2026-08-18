import "server-only";

import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

const DEFAULT_STALE_TIME_MS = 30 * 1000;

export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: DEFAULT_STALE_TIME_MS,
        },
      },
    }),
);
