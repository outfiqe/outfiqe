import "server-only";

import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "@outfiqe/shared-types";

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
};

export const serverApiRequest = async <T>(
  path: string,
  options: ServerRequestOptions = {},
): Promise<T> => {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);

  const isFailure = !res.ok || !json || !json.success;

  if (isFailure) {
    const err: Partial<ApiErrorEnvelope> | null = json;
    throw new ServerApiError(
      err?.message ?? `Request failed with ${res.status}`,
      err?.code ?? "UNKNOWN_ERROR",
      err?.details,
    );
  }

  const success: ApiSuccessEnvelope<T> = json;
  return success.data;
};
