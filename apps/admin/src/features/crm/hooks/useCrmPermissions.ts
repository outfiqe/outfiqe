import { useQuery } from "@tanstack/react-query";

import { crmApi } from "../api/crmApi";

export const useCrmPermissions = () => {
  const { data: organization } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
  });

  const hasPermission = (permissionKey: string) =>
    Boolean(
      organization?.viewerIsSuperAdmin ||
      organization?.viewerPermissionKeys.includes(permissionKey),
    );

  return { organization, hasPermission };
};
