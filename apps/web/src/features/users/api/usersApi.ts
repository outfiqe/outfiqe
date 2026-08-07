import { apiClient } from "@/shared/lib/apiClient";
import type { User } from "@outfiqe/shared-types";

export const usersApi = {
  list: () => apiClient.get<User[]>("/users"),
  get: (id: string) => apiClient.get<User>(`/users/${id}`),
};
