import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  toast,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ConfirmModal } from "@/components/ConfirmModal";
import { SkeletonBadge, SkeletonButton } from "@/components/SkeletonControls";
import { productTypesApi } from "@/features/product-types/api";
import { getErrorMessage } from "@/lib/errorMessages";

import { sizeOptionsApi } from "./api";
import type { SizeOption } from "./schemas";
import {
  EMPTY_SIZE_OPTION_FORM,
  sizeOptionFormSchema,
  type SizeOptionFormValues,
} from "./sizeOptionForm.schema";

const SizeOptionRowSkeleton = () => (
  <div
    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
    aria-hidden
  >
    <SkeletonBadge label="XL" />
    <SkeletonButton size="sm" label="Delete" />
  </div>
);

export const SizeOptionsPage = () => {
  const { data: productTypes } = useQuery({
    queryKey: ["admin-product-types"],
    queryFn: productTypesApi.list,
  });
  const { data: sizeOptions, isLoading } = useQuery({
    queryKey: ["admin-size-options"],
    queryFn: sizeOptionsApi.list,
  });

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const type = selectedType ?? productTypes?.[0]?.slug ?? null;
  const form = useForm<SizeOptionFormValues>({
    resolver: zodResolver(sizeOptionFormSchema),
    defaultValues: EMPTY_SIZE_OPTION_FORM,
    mode: "onTouched",
  });
  const [deleteTarget, setDeleteTarget] = useState<SizeOption | null>(null);

  const labelForType = (slug: string) =>
    productTypes?.find((productType) => productType.slug === slug)?.label ?? slug;

  const sizesForType = (sizeOptions ?? []).filter((sizeOption) => sizeOption.type === type);

  const create = useApiMutation({
    mutationFn: (values: SizeOptionFormValues) =>
      sizeOptionsApi.create({
        type: type ?? "",
        label: values.label,
        sortOrder: sizesForType.length,
      }),
    invalidateKeys: [["admin-size-options"]],
    successMessage: "Size added.",
    onSuccess: () => form.reset(EMPTY_SIZE_OPTION_FORM),
  });

  const remove = useApiMutation({
    mutationFn: (sizeOption: SizeOption) => sizeOptionsApi.remove(sizeOption.id),
    invalidateKeys: [["admin-size-options"]],
    successMessage: "Size deleted.",
    onSuccess: () => setDeleteTarget(null),
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const submitSizeOption = form.handleSubmit((values) => {
    if (type) create.mutate(values);
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Sizes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The size list a brand picks from when adding a product, per garment type.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {(productTypes ?? []).map((productType) => (
          <button
            key={productType.slug}
            onClick={() => setSelectedType(productType.slug)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              type === productType.slug
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {productType.label}
            {!productType.isActive && " (off)"}
          </button>
        ))}
      </div>

      {type && (
        <>
          <Form {...form}>
            <form
              onSubmit={submitSizeOption}
              noValidate
              className="mt-5 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem className="w-32 space-y-1.5">
                    <FormLabel className="text-xs font-normal text-muted-foreground">
                      Size label
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="M" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" isLoading={create.isPending} className="mt-[22px]">
                Add to {labelForType(type)}
              </Button>
            </form>
          </Form>

          {create.isError && (
            <FormBanner className="mt-3">{getErrorMessage(create.error)}</FormBanner>
          )}

          <div className="mt-6 space-y-3">
            {isLoading &&
              Array.from({ length: 3 }).map((_, index) => <SizeOptionRowSkeleton key={index} />)}
            {!isLoading && sizesForType.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No sizes yet for {labelForType(type)}.
              </p>
            )}

            {sizesForType.map((sizeOption) => (
              <div
                key={sizeOption.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <Badge tone="neutral" showDot={false}>
                  {sizeOption.label}
                </Badge>

                <Button variant="outline" size="sm" onClick={() => setDeleteTarget(sizeOption)}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {!type && (
        <p className="mt-6 text-sm text-muted-foreground">
          Add a garment type first, then come back to give it sizes.
        </p>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete size"
        description={deleteTarget ? `Delete the "${deleteTarget.label}" size?` : undefined}
        confirmLabel="Delete"
        destructive
        isPending={remove.isPending}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
