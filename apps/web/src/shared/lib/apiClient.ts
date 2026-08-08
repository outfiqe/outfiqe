const BASE_URL = "/api";

type SuccessEnvelope<T> = { success: true; message: string; data: T };
type ErrorEnvelope = { success: false; message: string; code: string; details?: unknown };

export class ApiClientError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.details = details;
  }
}

let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => {
  return accessToken;
};

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler;
};

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error("refresh failed");
      }

      const body = (await res.json()) as SuccessEnvelope<{ accessToken: string }>;
      setAccessToken(body.data.accessToken);
      return body.data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; skipAuthRetry?: boolean };

const request = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<SuccessEnvelope<T>> => {
  const { body, skipAuthRetry, headers, ...rest } = options;

  const doFetch = () =>
    fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  if (res.status === 401 && !skipAuthRetry) {
    try {
      await refreshAccessToken();
      res = await doFetch();
    } catch {
      setAccessToken(null);
      unauthorizedHandler?.();
      throw new ApiClientError(
        "Your session has expired. Please sign in again.",
        "SESSION_EXPIRED",
      );
    }
  }

  const json = await res.json().catch(() => null);

  if (!res.ok || !json || (json as { success?: boolean }).success !== true) {
    const err = json as Partial<ErrorEnvelope> | null;
    if (res.status === 401 && !skipAuthRetry) {
      setAccessToken(null);
      unauthorizedHandler?.();
    }
    throw new ApiClientError(
      err?.message ?? `Request failed with ${res.status}`,
      err?.code ?? "UNKNOWN_ERROR",
      err?.details,
    );
  }

  return json;
};

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
};
