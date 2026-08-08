const BASE_URL = "/api";

type SuccessEnvelope<T> = { success: true; message: string; data: T };
type ErrorEnvelope = { success: false; message: string; code: string; details?: unknown };
type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; skipAuthRetry?: boolean };

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let refreshPromise: Promise<string> | null = null;

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

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => {
  return accessToken;
};

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler;
};

const forceLogout = (): void => {
  if (accessToken === null) return;
  setAccessToken(null);
  unauthorizedHandler?.();
};

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

      const body: SuccessEnvelope<{ accessToken: string }> = await res.json();
      setAccessToken(body.data.accessToken);
      return body.data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

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
      body: body ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  if (res.status === 401 && !skipAuthRetry) {
    try {
      await refreshAccessToken();
      res = await doFetch();
    } catch {
      forceLogout();
      throw new ApiClientError(
        "Your session has expired. Please sign in again.",
        "SESSION_EXPIRED",
      );
    }
  }

  const json = await res.json().catch(() => null);

  const isFailure = !res.ok || !json || !json.success;

  if (isFailure) {
    const err: Partial<ErrorEnvelope> | null = json;
    if (res.status === 401 && !skipAuthRetry) {
      forceLogout();
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
