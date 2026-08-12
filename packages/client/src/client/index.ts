import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "@outfiqe/types";

import { ApiClientError } from "../errors";

type RequestOptions = AxiosRequestConfig & { skipAuthRetry?: boolean };
type RetriableConfig = InternalAxiosRequestConfig & { skipAuthRetry?: boolean; _retried?: boolean };

export type CreateApiClientOptions = {
  baseURL: string;
  refreshPath?: string;
};

export function createApiClient({
  baseURL,
  refreshPath = "/auth/refresh",
}: CreateApiClientOptions) {
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
    return config;
  });

  const refreshAccessToken = async (): Promise<string> => {
    if (!refreshPromise) {
      refreshPromise = axios
        .post<ApiSuccessEnvelope<{ accessToken: string }>>(
          `${baseURL}${refreshPath}`,
          {},
          { withCredentials: true },
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

      const body = error.response?.data;
      throw new ApiClientError(
        body?.message ?? error.message ?? "Request failed",
        body?.code ?? "UNKNOWN_ERROR",
        body?.details,
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

  const del = async <T>(path: string, options?: RequestOptions): Promise<ApiSuccessEnvelope<T>> => {
    const res = await http.delete<ApiSuccessEnvelope<T>>(path, options);
    return res.data;
  };

  return {
    get,
    post,
    patch,
    del,
    setAccessToken,
    getAccessToken,
    setUnauthorizedHandler,
    refresh: refreshAccessToken,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
