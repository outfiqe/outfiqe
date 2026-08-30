import { Button, FormBanner, Input } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { organizationsApi } from "./api";
import { BusinessOwnerField } from "./BusinessOwnerField";

export const OrganizationsPage = () => {
  const queryClient = useQueryClient();

  const {
    data: organizations,
    isLoading,
    error,
  } = useQuery({ queryKey: ["organizations"], queryFn: organizationsApi.list });

  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedBrandName, setSelectedBrandName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainTouchedByUser, setSubdomainTouchedByUser] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: suggestion, isFetching: isSuggesting } = useQuery({
    queryKey: ["organization-suggestion", selectedBrandId],
    queryFn: () => organizationsApi.suggestFromBrand(selectedBrandId as string),
    enabled: selectedBrandId !== null,
  });

  if (suggestion && !subdomainTouchedByUser && subdomain !== suggestion.suggestedSubdomain) {
    setSubdomain(suggestion.suggestedSubdomain);
  }

  const selectBusiness = (brand: { id: string; name: string } | null) => {
    setSelectedBrandId(brand?.id ?? null);
    setSelectedBrandName(brand?.name ?? "");
    setSubdomainTouchedByUser(false);
    if (!brand) setSubdomain("");
    setFormError(null);
  };

  const resetForm = () => {
    setSelectedBrandId(null);
    setSelectedBrandName("");
    setSubdomain("");
    setSubdomainTouchedByUser(false);
    setFormError(null);
  };

  const create = useMutation({
    mutationFn: () => {
      if (!suggestion) throw new Error("No business selected yet.");
      return organizationsApi.create({
        name: suggestion.brandName,
        subdomain,
        targetOwnerUserId: suggestion.ownerUserId,
        linkedBrandId: suggestion.brandId,
      });
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
    onError: (mutationError) => setFormError(getErrorMessage(mutationError)),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Organizations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Each organization is a fully independent CRM tenant — its own members, roles, and data. Pick
        a business already on Outfiqe; they become the new organization&apos;s owner once they
        accept.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <BusinessOwnerField
          selectedBrandId={selectedBrandId}
          selectedBrandName={selectedBrandName}
          onSelect={selectBusiness}
        />
        <div className="space-y-1.5">
          <label htmlFor="org-subdomain" className="text-xs text-muted-foreground">
            Subdomain
          </label>
          <Input
            id="org-subdomain"
            required
            pattern="[a-z0-9-]+"
            disabled={!selectedBrandId || isSuggesting}
            value={subdomain}
            onChange={(e) => {
              setSubdomainTouchedByUser(true);
              setSubdomain(e.target.value.toLowerCase());
            }}
            className="w-48"
          />
        </div>
        <Button type="submit" disabled={!selectedBrandId || isSuggesting || create.isPending}>
          {create.isPending ? "Creating…" : "Create organization"}
        </Button>
      </form>

      {suggestion && suggestion.existingOrganizationForBrand && (
        <FormBanner tone="neutral" className="mt-3">
          This business is already linked to the organization &ldquo;
          {suggestion.existingOrganizationForBrand.name}&rdquo;. Creating another will fail — link a
          different business instead.
        </FormBanner>
      )}

      {suggestion && suggestion.ownerExistingOrganizations.length > 0 && (
        <FormBanner tone="neutral" className="mt-3">
          {suggestion.ownerName} already owns:{" "}
          {suggestion.ownerExistingOrganizations
            .map((organization) => organization.name)
            .join(", ")}
        </FormBanner>
      )}

      {formError && <FormBanner className="mt-3">{formError}</FormBanner>}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}
        {!isLoading && !error && organizations?.length === 0 && (
          <p className="text-sm text-muted-foreground">No organizations yet.</p>
        )}

        {organizations?.map((organization) => (
          <div
            key={organization.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                {organization.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {organization.subdomain} · {organization.plan} ·{" "}
                {organization.linkedBrandName
                  ? `linked to ${organization.linkedBrandName}`
                  : "no linked brand"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
