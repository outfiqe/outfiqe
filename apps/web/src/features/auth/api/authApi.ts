import { apiClient } from "@/shared/lib/apiClient";
import type { AuthTokens, LoginInput } from "../types";

// All network calls for this feature live in one place. Components and
// hooks never call fetch/apiClient directly.
export const authApi = {
  login: (input: LoginInput) => apiClient.post<AuthTokens>("/auth/login", input),
};
