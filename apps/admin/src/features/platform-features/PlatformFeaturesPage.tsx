import { Button, FormBanner, Select, Skeleton } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { platformMetricsApi } from "../platform-metrics/api";
import { platformFeaturesApi } from "./api";

const SOURCE_LABEL: Record<string, string> = {
  override: "Override",
  plan: "Plan default",
  default: "Registry default",
};

export const PlatformFeaturesPage = () => {
  const queryClient = useQueryClient();
  const [orgId, setOrgId] = useState("");

  const tenants = useQuery({
    queryKey: ["platform-features-tenants"],
    queryFn: () => platformMetricsApi.listTenants({ pageSize: 100, sort: "name" }),
  });

  const registry = useQuery({
    queryKey: ["platform-features-registry"],
    queryFn: platformFeaturesApi.getRegistry,
  });

  const resolved = useQuery({
    queryKey: ["platform-features-resolved", orgId],
    queryFn: () => platformFeaturesApi.getTenantFeatures(orgId),
    enabled: orgId !== "",
  });

  const mutate = useMutation({
    mutationFn: (
      action: { key: string; kind: "set"; enabled: boolean } | { key: string; kind: "clear" },
    ) =>
      action.kind === "set"
        ? platformFeaturesApi.setOverride(orgId, action.key, action.enabled)
        : platformFeaturesApi.clearOverride(orgId, action.key),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["platform-features-resolved", orgId] }),
  });

  const labelByKey = new Map(
    (registry.data ?? []).map((entry) => [entry.key, entry.label] as const),
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Feature flags</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Override a plan default for one tenant. Clearing an override reverts to the plan.
      </p>

      <div className="mt-6 max-w-sm">
        <label htmlFor="tenant-select" className="text-xs text-muted-foreground">
          Tenant
        </label>
        <Select
          id="tenant-select"
          value={orgId}
          onChange={(event) => setOrgId(event.target.value)}
          className="mt-1"
        >
          <option value="">Select a tenant…</option>
          {(tenants.data?.items ?? []).map((tenant) => (
            <option key={tenant.organizationId} value={tenant.organizationId}>
              {tenant.name} ({tenant.plan})
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6">
        {mutate.isError && <FormBanner>{getErrorMessage(mutate.error)}</FormBanner>}
        {orgId === "" && (
          <p className="text-sm text-muted-foreground">Pick a tenant to see its features.</p>
        )}
        {orgId !== "" && resolved.isLoading && <Skeleton className="h-40 w-full" />}
        {resolved.error && <FormBanner>{getErrorMessage(resolved.error)}</FormBanner>}

        {resolved.data && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Feature</th>
                  <th className="py-2 pr-4">State</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resolved.data.map((feature) => (
                  <tr key={feature.key} className="border-t border-border">
                    <td className="py-2 pr-4">
                      {labelByKey.get(feature.key) ?? feature.key}
                      <span className="ml-2 text-xs text-muted-foreground">{feature.key}</span>
                    </td>
                    <td className="py-2 pr-4">{feature.enabled ? "Enabled" : "Disabled"}</td>
                    <td className="py-2 pr-4">{SOURCE_LABEL[feature.source]}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={mutate.isPending}
                          onClick={() =>
                            mutate.mutate({
                              key: feature.key,
                              kind: "set",
                              enabled: !feature.enabled,
                            })
                          }
                        >
                          {feature.enabled ? "Disable" : "Enable"}
                        </Button>
                        {feature.source === "override" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={mutate.isPending}
                            onClick={() => mutate.mutate({ key: feature.key, kind: "clear" })}
                          >
                            Clear override
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
