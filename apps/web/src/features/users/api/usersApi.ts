import type { User } from "@outfiqe/types";

import { apiClient } from "@/shared/lib/apiClient";

export const usersApi = {
  list: () => apiClient.get<User[]>("/users").then((res) => res.data),
  get: (id: string) => apiClient.get<User>(`/users/${id}`).then((res) => res.data),
};
