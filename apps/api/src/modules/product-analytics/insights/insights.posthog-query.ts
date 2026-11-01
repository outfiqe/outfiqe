import { z } from "zod";

import { env } from "#config/env.config.js";

import { POSTHOG_QUERY_NAME_PREFIX, POSTHOG_QUERY_TIMEOUT_MS } from "./insights.constants.js";
import type { PosthogQueryConnection } from "./insights.types.js";

const MAX_CONCURRENT_POSTHOG_QUERIES = 2;

const queryResponseSchema = z.object({ results: z.array(z.array(z.unknown())) });

let runningQueryCount = 0;
const queriesWaitingForSlot: (() => void)[] = [];

const waitForQuerySlot = async (): Promise<void> => {
  if (runningQueryCount < MAX_CONCURRENT_POSTHOG_QUERIES) {
    runningQueryCount += 1;
    return;
  }
  await new Promise<void>((resolve) => queriesWaitingForSlot.push(resolve));
};

const releaseQuerySlot = (): void => {
  const nextWaitingQuery = queriesWaitingForSlot.shift();
  if (nextWaitingQuery) {
    nextWaitingQuery();
    return;
  }
  runningQueryCount -= 1;
};

export const findPosthogQueryConnection = (): PosthogQueryConnection | null => {
  if (!env.POSTHOG_PROJECT_ID || !env.POSTHOG_QUERY_API_KEY) return null;
  return {
    appHost: env.POSTHOG_APP_HOST,
    projectId: env.POSTHOG_PROJECT_ID,
    queryApiKey: env.POSTHOG_QUERY_API_KEY,
  };
};

export const runPosthogQuery = async (
  { appHost, projectId, queryApiKey }: PosthogQueryConnection,
  queryName: string,
  hogqlQuery: string,
): Promise<unknown[][]> => {
  await waitForQuerySlot();
  try {
    const response = await fetch(new URL(`/api/projects/${projectId}/query/`, appHost), {
      method: "POST",
      headers: { Authorization: `Bearer ${queryApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: { kind: "HogQLQuery", query: hogqlQuery },
        name: `${POSTHOG_QUERY_NAME_PREFIX}:${queryName}`,
      }),
      signal: AbortSignal.timeout(POSTHOG_QUERY_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`PostHog query ${queryName} answered with status ${response.status}`);
    }
    return queryResponseSchema.parse(await response.json()).results;
  } finally {
    releaseQuerySlot();
  }
};
