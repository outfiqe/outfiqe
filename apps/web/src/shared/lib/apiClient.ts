import { ApiClientError, createApiClient } from "@outfiqe/client";

const client = createApiClient({ baseURL: "/api" });

export const { setAccessToken, getAccessToken, setUnauthorizedHandler } = client;
export const apiClient = client;
export { ApiClientError };
