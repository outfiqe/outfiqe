import { Badge, Button, FormBanner, Select, Skeleton, Switch } from "@outfiqe/design-system";
import { MAX_PLATFORM_CO_FOUNDERS, PLATFORM_NAV_KEYS, type PlatformNavKey } from "@outfiqe/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { getErrorMessage } from "@/lib/errorMessages";

import { platformNavAccessApi } from "./api";

const NAV_KEY_LABELS: Record<PlatformNavKey, string> = {
  "brand-applications": "Brand applications",
  "platform-metrics": "Tenant metrics",
  "platform-features": "Feature flags",
  "platform-impersonation": "Impersonation",
  "platform-nav-access": "Navigation access",
  products: "Products",
  collections: "Collections",
  categories: "Categories",
  "product-types": "Garment types",
  "size-options": "Sizes",
  "hero-slides": "Hero slides",
  orders: "Orders",
  support: "Support requests",
  "product-reviews": "Product reviews",
  trending: "Trending debug",
  creators: "Creators",
  commissions: "Commissions",
  "platform-commission": "Platform commission",
  "withdraw-requests": "Withdrawal requests",
  "withdraw-policy": "Withdrawal policy",
  "financial-rollup": "Financial rollup",
  coupons: "Coupons",
  gamification: "Gamification",
  "delivery-zones": "Delivery zones",
  organizations: "Organizations",
  team: "Team",
};

const TOGGLEABLE_NAV_KEYS = PLATFORM_NAV_KEYS.filter((key) => key !== "platform-nav-access");

const OVERVIEW_QUERY_KEY = ["platform-nav-access"] as const;
const CANDIDATES_QUERY_KEY = ["platform-nav-access-candidates"] as const;

export const PlatformNavAccessPage = () => {
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMembershipId, setSelectedMembershipId] = useState("");

  const isCoFounder = state.status === "signed-in" && state.user.isCoFounder;

  const overview = useQuery({
    queryKey: OVERVIEW_QUERY_KEY,
    queryFn: platformNavAccessApi.getOverview,
    enabled: isCoFounder,
  });

  const candidates = useQuery({
    queryKey: CANDIDATES_QUERY_KEY,
    queryFn: platformNavAccessApi.listCandidates,
    enabled: isCoFounder,
  });

  const saveHidden = useMutation({
    mutationFn: platformNavAccessApi.setHiddenNavKeys,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY }),
  });

  const promote = useMutation({
    mutationFn: platformNavAccessApi.promoteCoFounder,
    onSuccess: () => {
      setSelectedMembershipId("");
      queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CANDIDATES_QUERY_KEY });
    },
  });

  const demote = useMutation({
    mutationFn: platformNavAccessApi.demoteCoFounder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CANDIDATES_QUERY_KEY });
    },
  });

  if (!isCoFounder) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Navigation access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only co-founders can manage platform navigation access.
        </p>
      </div>
    );
  }

  const hiddenNavKeys = new Set(overview.data?.hiddenNavKeys ?? []);
  const coFounders = overview.data?.coFounders ?? [];
  const isLastCoFounder = coFounders.length <= 1;

  const toggleNavKey = (navKey: PlatformNavKey, nextVisible: boolean) => {
    const next = new Set(hiddenNavKeys);
    if (nextVisible) next.delete(navKey);
    else next.add(navKey);
    saveHidden.mutate([...next]);
  };

  const mutationError = saveHidden.error ?? promote.error ?? demote.error;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Navigation access</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose which platform navigation items every non-co-founder admin can see and reach.
        Co-founders always see everything.
      </p>

      {mutationError && (
        <div className="mt-4">
          <FormBanner>{getErrorMessage(mutationError)}</FormBanner>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Navigation items
        </h2>
        {overview.isLoading && <Skeleton className="mt-3 h-64 w-full" />}
        {overview.error && (
          <div className="mt-3">
            <FormBanner>{getErrorMessage(overview.error)}</FormBanner>
          </div>
        )}
        {overview.data && (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {TOGGLEABLE_NAV_KEYS.map((navKey) => {
              const isVisible = !hiddenNavKeys.has(navKey);
              return (
                <li
                  key={navKey}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                >
                  <span className="text-foreground">{NAV_KEY_LABELS[navKey]}</span>
                  <label className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {isVisible ? "Visible" : "Hidden"}
                    </span>
                    <Switch
                      checked={isVisible}
                      disabled={saveHidden.isPending}
                      onChange={(event) => toggleNavKey(navKey, event.target.checked)}
                      aria-label={`${NAV_KEY_LABELS[navKey]} visibility`}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Co-founders ({coFounders.length}/{MAX_PLATFORM_CO_FOUNDERS})
        </h2>

        {overview.data && (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {coFounders.map((coFounder) => (
              <li
                key={coFounder.membershipId}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-foreground">{coFounder.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {coFounder.email}
                    </span>
                  </span>
                  <Badge tone="positive" showDot={false} className="shrink-0 text-[10px]">
                    Co-founder
                  </Badge>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={demote.isPending || isLastCoFounder}
                  title={
                    isLastCoFounder
                      ? "Promote another member before removing the last one"
                      : undefined
                  }
                  onClick={() => demote.mutate(coFounder.membershipId)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        {coFounders.length < MAX_PLATFORM_CO_FOUNDERS && (
          <div className="mt-4 flex max-w-md items-end gap-2">
            <label className="flex-1">
              <span className="text-xs text-muted-foreground">Add a co-founder</span>
              <Select
                className="mt-1"
                value={selectedMembershipId}
                disabled={candidates.isLoading || promote.isPending}
                onChange={(event) => setSelectedMembershipId(event.target.value)}
              >
                <option value="">Select a platform member…</option>
                {(candidates.data ?? []).map((candidate) => (
                  <option key={candidate.membershipId} value={candidate.membershipId}>
                    {candidate.name} ({candidate.email})
                  </option>
                ))}
              </Select>
            </label>
            <Button
              disabled={selectedMembershipId === "" || promote.isPending}
              onClick={() => promote.mutate(selectedMembershipId)}
            >
              Add
            </Button>
          </div>
        )}
        {candidates.data?.length === 0 && coFounders.length < MAX_PLATFORM_CO_FOUNDERS && (
          <p className="mt-2 text-xs text-muted-foreground">
            Every active platform member is already a co-founder.
          </p>
        )}
      </section>
    </div>
  );
};
