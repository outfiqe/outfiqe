import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  Button,
  FormBanner,
  Input,
  Skeleton,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { platformCommissionApi } from "./api";
import type { BrandCommissionExemption } from "./schemas";

const EXEMPTIONS_QUERY_KEY = ["admin-brand-commission-exemptions"];
const BRAND_SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 1;

const BrandPickerField = ({
  brandId,
  brandName,
  onChange,
}: {
  brandId: string | null;
  brandName: string;
  onChange: (brand: { id: string; name: string } | null) => void;
}) => {
  const [query, setQuery] = useState(brandName);

  const [syncedName, setSyncedName] = useState(brandName);
  if (brandName !== syncedName) {
    setSyncedName(brandName);
    setQuery(brandName);
  }

  const debouncedQuery = useDebouncedValue(query, BRAND_SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const { data: results, isLoading } = useQuery({
    queryKey: ["admin-exemption-brand-search", debouncedQuery],
    queryFn: () => platformCommissionApi.searchBrands(debouncedQuery.trim()),
    enabled: isSearching,
  });
  const brands = results ?? [];

  const selectBrand = (candidateId: string) => {
    const brand = brands.find((candidate) => candidate.id === candidateId);
    if (!brand) return;
    setQuery(brand.name);
    onChange(brand);
  };

  const clearBrand = () => {
    setQuery("");
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor="exemption-brand" className="block text-xs text-muted-foreground">
        Brand
      </label>
      <Autocomplete>
        <div className="relative">
          <AutocompleteInput
            id="exemption-brand"
            placeholder="Search brands…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => setQuery(brandId ? syncedName : "")}
            className="w-56 pr-8"
          />
          {brandId && (
            <button
              type="button"
              onClick={clearBrand}
              aria-label="Clear brand"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {isSearching && (
          <AutocompleteContent className="mt-2">
            {isLoading &&
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="mx-1.5 my-1 h-7 rounded-md" />
              ))}

            {!isLoading && brands.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No brands found for &ldquo;{debouncedQuery}&rdquo;
              </p>
            )}

            {brands.map((brand) => (
              <AutocompleteItem
                key={brand.id}
                value={brand.id}
                onSelect={() => selectBrand(brand.id)}
              >
                <span className="truncate text-[13px] text-foreground">{brand.name}</span>
              </AutocompleteItem>
            ))}
          </AutocompleteContent>
        )}
      </Autocomplete>
    </div>
  );
};

type ExemptionFormState = {
  brandId: string | null;
  brandName: string;
  startsAt: string;
  endsAt: string;
  reason: string;
};

const EMPTY_FORM: ExemptionFormState = {
  brandId: null,
  brandName: "",
  startsAt: "",
  endsAt: "",
  reason: "",
};

export const BrandExemptionsSection = () => {
  const queryClient = useQueryClient();
  const { data: exemptions, isLoading } = useQuery({
    queryKey: EXEMPTIONS_QUERY_KEY,
    queryFn: platformCommissionApi.listExemptions,
  });

  const [form, setForm] = useState<ExemptionFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: EXEMPTIONS_QUERY_KEY });

  const create = useMutation({
    mutationFn: () => {
      if (!form.brandId) throw new Error("Pick a brand first.");
      return platformCommissionApi.createExemption({
        brandId: form.brandId,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        reason: form.reason,
      });
    },
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setError(null);
      invalidate();
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => platformCommissionApi.revokeExemption(id),
    onSuccess: invalidate,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.brandId) {
      setError("Pick a brand first.");
      return;
    }
    create.mutate();
  };

  const handleRevoke = (exemption: BrandCommissionExemption) => {
    if (window.confirm(`Revoke ${exemption.brandName}'s commission exemption?`)) {
      revoke.mutate(exemption.id);
    }
  };

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">
        Brand commission exemptions
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Time-boxed brands that keep the full sale price with no platform commission. The gateway fee
        estimate still applies for non-cash payments.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <BrandPickerField
          brandId={form.brandId}
          brandName={form.brandName}
          onChange={(brand) =>
            setForm({ ...form, brandId: brand?.id ?? null, brandName: brand?.name ?? "" })
          }
        />
        <div className="space-y-1.5">
          <label className="block text-xs text-muted-foreground">Starts</label>
          <Input
            type="date"
            required
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-muted-foreground">Ends</label>
          <Input
            type="date"
            required
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          />
        </div>
        <div className="min-w-[14rem] flex-1 space-y-1.5">
          <label className="block text-xs text-muted-foreground">Reason</label>
          <Input
            required
            placeholder="e.g. Launch-cohort waiver, first 10 brands"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Adding…" : "Add exemption"}
        </Button>
      </form>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {exemptions?.length === 0 && (
          <p className="text-sm text-muted-foreground">No exemptions yet.</p>
        )}

        {exemptions?.map((exemption) => {
          const isRevoked = exemption.revokedAt !== null;
          return (
            <div
              key={exemption.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {exemption.brandName}
                  {isRevoked && <span className="ml-2 text-xs text-destructive">Revoked</span>}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(exemption.startsAt).toLocaleDateString()} –{" "}
                  {new Date(exemption.endsAt).toLocaleDateString()} · {exemption.reason}
                </p>
              </div>
              {!isRevoked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevoke(exemption)}
                  disabled={revoke.isPending}
                >
                  Revoke
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
