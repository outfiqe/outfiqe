import { ApiClientError, createApiClient } from "@outfiqe/api-client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const client = createApiClient({ baseURL: `${API_URL}/api` });

export const { setAccessToken, getAccessToken, setUnauthorizedHandler } = client;
export const apiClient = client;
export { ApiClientError };
