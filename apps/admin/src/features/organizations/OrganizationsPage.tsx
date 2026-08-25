import { Button, FormBanner, Input } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { organizationsApi } from "./api";

export const OrganizationsPage = () => {
  const queryClient = useQueryClient();

  const {
    data: organizations,
    isLoading,
    error,
  } = useQuery({ queryKey: ["organizations"], queryFn: organizationsApi.list });

  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => organizationsApi.create(name, subdomain),
    onSuccess: () => {
      setName("");
      setSubdomain("");
      setFormError(null);
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
        Each organization is a fully independent CRM tenant — its own members, roles, and data.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="org-name" className="text-xs text-muted-foreground">
            Name
          </label>
          <Input
            id="org-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-48"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="org-subdomain" className="text-xs text-muted-foreground">
            Subdomain
          </label>
          <Input
            id="org-subdomain"
            required
            pattern="[a-z0-9-]+"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
            className="w-48"
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create organization"}
        </Button>
      </form>

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
                {organization.subdomain} · {organization.plan}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
