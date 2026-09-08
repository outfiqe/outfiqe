import "server-only";

import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "@outfiqe/types";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export class ServerApiError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "ServerApiError";
    this.code = code;
    this.details = details;
  }
}

type ServerRequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  cookie?: string;
  accessToken?: string;
  revalidateSeconds?: number;
  cacheTags?: string[];
};

export const serverApiRequest = async <T>(
  path: string,
  { method, body, cookie, accessToken, revalidateSeconds, cacheTags }: ServerRequestOptions = {},
): Promise<T> => {
  const isCacheable = revalidateSeconds !== undefined;

  if (isCacheable && (cookie || accessToken)) {
    throw new ServerApiError(
      "A per-user request must not be shared in the data cache.",
      "UNCACHEABLE_AUTHENTICATED_REQUEST",
    );
  }

  const cacheInit = isCacheable
    ? { next: { revalidate: revalidateSeconds, ...(cacheTags?.length ? { tags: cacheTags } : {}) } }
    : { cache: "no-store" as const };

  const response = await fetch(`${API_URL}/api${path}`, {
    method: method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    ...cacheInit,
  });

  const json = await response.json().catch(() => null);

  const isFailure = !response.ok || !json || !json.success;

  if (isFailure) {
    const errorEnvelope: Partial<ApiErrorEnvelope> | null = json;
    throw new ServerApiError(
      errorEnvelope?.message ?? `Request failed with ${response.status}`,
      errorEnvelope?.code ?? "UNKNOWN_ERROR",
      errorEnvelope?.details,
    );
  }

  const success: ApiSuccessEnvelope<T> = json;
  return success.data;
};
