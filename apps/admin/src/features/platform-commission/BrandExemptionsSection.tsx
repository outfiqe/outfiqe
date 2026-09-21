import { zodResolver } from "@hookform/resolvers/zod";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  Button,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Skeleton,
  toast,
} from "@outfiqe/design-system";
import { useApiMutation, useDebouncedValue } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ActionRowSkeleton } from "@/components/ActionRowSkeleton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { getErrorMessage } from "@/lib/errorMessages";

import { platformCommissionApi } from "./api";
import {
  EMPTY_EXEMPTION_FORM,
  exemptionFormSchema,
  type ExemptionFormValues,
} from "./exemptionForm.schema";
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
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const query = typedQuery ?? brandName;

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
    setTypedQuery(null);
    onChange(brand);
  };

  const clearBrand = () => {
    setTypedQuery(null);
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
            onChange={(event) => setTypedQuery(event.target.value)}
            onBlur={() => setTypedQuery(null)}
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

const LABEL_CLASS = "text-xs font-normal text-muted-foreground";

export const BrandExemptionsSection = () => {
  const { data: exemptions, isLoading } = useQuery({
    queryKey: EXEMPTIONS_QUERY_KEY,
    queryFn: platformCommissionApi.listExemptions,
  });

  const form = useForm<ExemptionFormValues>({
    resolver: zodResolver(exemptionFormSchema),
    defaultValues: EMPTY_EXEMPTION_FORM,
    mode: "onTouched",
  });
  const [pickedBrandName, setPickedBrandName] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<BrandCommissionExemption | null>(null);

  const create = useApiMutation({
    mutationFn: (values: ExemptionFormValues) =>
      platformCommissionApi.createExemption({
        brandId: values.brandId,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        reason: values.reason.trim(),
      }),
    invalidateKeys: [EXEMPTIONS_QUERY_KEY],
    successMessage: "Exemption added.",
    onSuccess: () => {
      form.reset(EMPTY_EXEMPTION_FORM);
      setPickedBrandName("");
    },
  });

  const revoke = useApiMutation({
    mutationFn: (id: string) => platformCommissionApi.revokeExemption(id),
    invalidateKeys: [EXEMPTIONS_QUERY_KEY],
    successMessage: "Exemption revoked.",
    onSuccess: () => setRevokeTarget(null),
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const submitExemption = form.handleSubmit((values) => create.mutate(values));

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">
        Brand commission exemptions
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Time-boxed brands that keep the full sale price with no platform commission. The gateway fee
        estimate still applies for non-cash payments.
      </p>

      <Form {...form}>
        <form
          onSubmit={submitExemption}
          noValidate
          className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
        >
          <FormField
            control={form.control}
            name="brandId"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <BrandPickerField
                  brandId={field.value || null}
                  brandName={pickedBrandName}
                  onChange={(brand) => {
                    setPickedBrandName(brand?.name ?? "");
                    field.onChange(brand?.id ?? "");
                  }}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startsAt"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel className={LABEL_CLASS}>Starts</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endsAt"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel className={LABEL_CLASS}>Ends</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem className="mt-0 min-w-[14rem] flex-1 space-y-1.5">
                <FormLabel className={LABEL_CLASS}>Reason</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Launch-cohort waiver, first 10 brands" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" isLoading={create.isPending} className="mt-[22px]">
            Add exemption
          </Button>
        </form>
      </Form>

      {create.isError && <FormBanner className="mt-3">{getErrorMessage(create.error)}</FormBanner>}

      <div className="mt-4 space-y-2">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <ActionRowSkeleton key={index} bodyLineCount={1} />
          ))}
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
                  onClick={() => setRevokeTarget(exemption)}
                  disabled={revoke.isPending}
                >
                  Revoke
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={revokeTarget !== null}
        title="Revoke commission exemption"
        description={
          revokeTarget ? `Revoke ${revokeTarget.brandName}'s commission exemption?` : undefined
        }
        confirmLabel="Revoke"
        destructive
        isPending={revoke.isPending}
        onConfirm={() => {
          if (revokeTarget) revoke.mutate(revokeTarget.id);
        }}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
};
