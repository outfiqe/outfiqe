import { ApiClientError, createApiClient } from "@outfiqe/client";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const client = createApiClient({ baseURL: API_BASE_URL });

export const { setAccessToken, getAccessToken, setUnauthorizedHandler } = client;
export const apiClient = client;
export { ApiClientError };
