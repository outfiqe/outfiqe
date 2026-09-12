import { ApiClientError, createApiClient } from "@outfiqe/client";

const client = createApiClient({ baseURL: "/api" });

export const { setAccessToken, getAccessToken, setUnauthorizedHandler, setSuspendedHandler } =
  client;
export const apiClient = client;
export { ApiClientError };
export type { SuspendedAccountDetails } from "@outfiqe/client";
