import { useQuery } from "@tanstack/react-query";

import { usersApi } from "../api/usersApi";

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
  });
};
