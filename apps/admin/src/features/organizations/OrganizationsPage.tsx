import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { organizationsApi } from "./api";
import { BusinessOwnerField } from "./BusinessOwnerField";
import {
  EMPTY_ORGANIZATION_FORM,
  organizationFormSchema,
  type OrganizationFormValues,
} from "./organizationForm.schema";

const ORGANIZATIONS_QUERY_KEY = ["organizations"];

export const OrganizationsPage = () => {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ORGANIZATIONS_QUERY_KEY,
      queryFn: ({ pageParam }) => organizationsApi.list(pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });
  const organizations = data?.pages.flatMap((page) => page.organizations);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: EMPTY_ORGANIZATION_FORM,
    mode: "onTouched",
  });
  const pickedBrand = form.watch("brand");
  const pickedBrandId = pickedBrand?.id ?? null;

  const { data: suggestion, isFetching: isSuggesting } = useQuery({
    queryKey: ["organization-suggestion", pickedBrandId],
    queryFn: () => organizationsApi.suggestFromBrand(pickedBrandId ?? ""),
    enabled: pickedBrandId !== null,
  });

  const suggestedSubdomain = suggestion?.suggestedSubdomain;
  useEffect(() => {
    if (suggestedSubdomain === undefined) return;
    if (form.getFieldState("subdomain").isDirty) return;
    form.setValue("subdomain", suggestedSubdomain, { shouldValidate: true });
  }, [suggestedSubdomain, form]);

  const create = useApiMutation({
    mutationFn: (values: OrganizationFormValues) => {
      if (!suggestion) throw new Error("No business selected yet.");
      return organizationsApi.create({
        name: suggestion.brandName,
        subdomain: values.subdomain,
        targetOwnerUserId: suggestion.ownerUserId,
        linkedBrandId: suggestion.brandId,
      });
    },
    invalidateKeys: [ORGANIZATIONS_QUERY_KEY],
    successMessage: "Organization created.",
    onSuccess: () => form.reset(EMPTY_ORGANIZATION_FORM),
  });

  const submitOrganization = form.handleSubmit((values) => create.mutate(values));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Organizations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Each organization is a fully independent CRM tenant — its own members, roles, and data. Pick
        a business already on Outfiqe; they become the new organization&apos;s owner once they
        accept.
      </p>

      <Form {...form}>
        <form
          onSubmit={submitOrganization}
          noValidate
          className="mt-5 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
        >
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <BusinessOwnerField
                  selectedBrandId={field.value?.id ?? null}
                  selectedBrandName={field.value?.name ?? ""}
                  onSelect={(brand) => {
                    field.onChange(brand ? { id: brand.id, name: brand.name } : null);
                    form.resetField("subdomain");
                  }}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subdomain"
            render={({ field }) => (
              <FormItem className="w-48 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">
                  Subdomain
                </FormLabel>
                <FormControl>
                  <Input
                    disabled={!pickedBrandId || isSuggesting}
                    {...field}
                    onChange={(event) => field.onChange(event.target.value.toLowerCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={isSuggesting}
            isLoading={create.isPending}
            className="mt-[22px]"
          >
            Create organization
          </Button>
        </form>
      </Form>

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

      {create.isError && <FormBanner className="mt-3">{getErrorMessage(create.error)}</FormBanner>}

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <CardRowSkeleton key={index} hasBadge={false} textLineCount={1} />
          ))}
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

        {hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            isLoading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            Load more
          </Button>
        )}
      </div>
    </div>
  );
};
