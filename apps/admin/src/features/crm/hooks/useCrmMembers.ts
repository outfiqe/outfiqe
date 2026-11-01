import { useQuery } from "@tanstack/react-query";

import { crmApi } from "../api/crmApi";
import { useCrmPermissions } from "./useCrmPermissions";

export const useCrmMembers = () => {
  const { hasPermission } = useCrmPermissions();
  const { data: members } = useQuery({
    queryKey: ["crm-members"],
    queryFn: crmApi.listMembers,
    enabled: hasPermission("members:read"),
  });
  return members;
};
