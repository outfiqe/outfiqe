import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "@outfiqe/types";
import type { AxiosError } from "axios";
import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

import { ApiClientError } from "../errors";

type RequestOptions = AxiosRequestConfig & { skipAuthRetry?: boolean };
type RetriableConfig = InternalAxiosRequestConfig & { skipAuthRetry?: boolean; _retried?: boolean };

const CSRF_TOKEN_COOKIE_NAME = "csrf_token";
const CSRF_TOKEN_HEADER_NAME = "X-CSRF-Token";

const getCsrfTokenFromCookie = (): string | undefined => {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_TOKEN_COOKIE_NAME}=([^;]*)`));
  const rawValue = match?.at(1);
  return rawValue ? decodeURIComponent(rawValue) : undefined;
};

export type CreateApiClientOptions = {
  baseURL: string;
  refreshPath?: string;
};

export const createApiClient = ({
  baseURL,
  refreshPath = "/auth/refresh",
}: CreateApiClientOptions) => {
  let accessToken: string | null = null;
  let unauthorizedHandler: (() => void) | null = null;
  let refreshPromise: Promise<string> | null = null;

  const setAccessToken = (token: string | null): void => {
    accessToken = token;
  };

  const getAccessToken = (): string | null => accessToken;

  const setUnauthorizedHandler = (handler: (() => void) | null): void => {
    unauthorizedHandler = handler;
  };

  const http = axios.create({ baseURL, withCredentials: true });

  http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.set("Authorization", `Bearer ${accessToken}`);
    }
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      config.headers.set(CSRF_TOKEN_HEADER_NAME, csrfToken);
    }
    return config;
  });

  const refreshAccessToken = async (): Promise<string> => {
    if (!refreshPromise) {
      const csrfToken = getCsrfTokenFromCookie();
      refreshPromise = axios
        .post<ApiSuccessEnvelope<{ accessToken: string }>>(
          `${baseURL}${refreshPath}`,
          {},
          {
            withCredentials: true,
            ...(csrfToken ? { headers: { [CSRF_TOKEN_HEADER_NAME]: csrfToken } } : {}),
          },
        )
        .then((res) => {
          accessToken = res.data.data.accessToken;
          return accessToken;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    return refreshPromise;
  };

  http.interceptors.response.use(
    (res) => res,
    async (error: AxiosError<ApiErrorEnvelope>) => {
      const config: RetriableConfig | undefined = error.config;

      if (error.response?.status === 401 && config && !config._retried && !config.skipAuthRetry) {
        config._retried = true;
        try {
          await refreshAccessToken();
          return http(config);
        } catch {
          accessToken = null;
          unauthorizedHandler?.();
        }
      }

      const { message, code, details } = error.response?.data ?? {};
      throw new ApiClientError(
        message ?? error.message ?? "Request failed",
        code ?? "UNKNOWN_ERROR",
        details,
      );
    },
  );

  const get = async <T>(path: string, options?: RequestOptions): Promise<ApiSuccessEnvelope<T>> => {
    const res = await http.get<ApiSuccessEnvelope<T>>(path, options);
    return res.data;
  };

  const post = async <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiSuccessEnvelope<T>> => {
    const res = await http.post<ApiSuccessEnvelope<T>>(path, body, options);
    return res.data;
  };

  const patch = async <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiSuccessEnvelope<T>> => {
    const res = await http.patch<ApiSuccessEnvelope<T>>(path, body, options);
    return res.data;
  };

  const put = async <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiSuccessEnvelope<T>> => {
    const res = await http.put<ApiSuccessEnvelope<T>>(path, body, options);
    return res.data;
  };

  const del = async <T>(path: string, options?: RequestOptions): Promise<ApiSuccessEnvelope<T>> => {
    const res = await http.delete<ApiSuccessEnvelope<T>>(path, options);
    return res.data;
  };

  return {
    get,
    post,
    patch,
    put,
    del,
    setAccessToken,
    getAccessToken,
    setUnauthorizedHandler,
    refresh: refreshAccessToken,
  };
};

export type ApiClient = ReturnType<typeof createApiClient>;
