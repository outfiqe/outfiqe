import { apiClient } from "@/shared/lib/apiClient";
import type { User } from "@outfiqe/types";

export const usersApi = {
  list: () => apiClient.get<User[]>("/users").then((res) => res.data),
  get: (id: string) => apiClient.get<User>(`/users/${id}`).then((res) => res.data),
};
