import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  cn,
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
import { useApiMutation, useDragReorder } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ReorderRowSkeleton } from "@/components/ReorderRowSkeleton";
import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { getErrorMessage } from "@/lib/errorMessages";
import { FORM_VALIDATION_MODE } from "@/lib/formValidation";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";
import { DEFAULT_SKELETON_ROW_COUNT } from "@/lib/skeletons";
import { slugify } from "@/lib/slugify";
import { useOptimisticReorder } from "@/lib/useOptimisticReorder";

import { productTypesApi } from "../api/productTypesApi";
import type { ProductType } from "../api/productTypesSchemas";
import {
  EMPTY_PRODUCT_TYPE_FORM,
  productTypeFormSchema,
  type ProductTypeFormValues,
} from "../schemas/productTypeForm.schema";

const QUERY_KEY = ["admin-product-types"];

export const ProductTypesPage = () => {
  const { canUse } = usePlatformPermissions();
  const canManageCatalog = canUse(PLATFORM_MANAGE_PERMISSION.CATALOG);
  const { data: productTypes, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: productTypesApi.list,
  });

  const form = useForm<ProductTypeFormValues>({
    resolver: zodResolver(productTypeFormSchema),
    defaultValues: EMPTY_PRODUCT_TYPE_FORM,
    mode: FORM_VALIDATION_MODE,
  });
  const [slugTouched, setSlugTouched] = useState(false);

  const create = useApiMutation({
    mutationFn: (values: ProductTypeFormValues) => productTypesApi.create(values),
    invalidateKeys: [QUERY_KEY],
    successMessage: "Garment type created.",
    onSuccess: () => {
      form.reset(EMPTY_PRODUCT_TYPE_FORM);
      setSlugTouched(false);
    },
  });

  const toggleActive = useApiMutation({
    mutationFn: (productType: ProductType) =>
      productTypesApi.setActive(productType.id, !productType.isActive),
    invalidateKeys: [QUERY_KEY],
    successMessage: (updated) =>
      updated.isActive ? "Garment type switched on." : "Garment type switched off.",
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const toggleSizeCharts = useApiMutation({
    mutationFn: (productType: ProductType) =>
      productTypesApi.setSupportsFitRanges(productType.id, !productType.supportsFitRanges),
    invalidateKeys: [QUERY_KEY],
    successMessage: (updated) =>
      updated.supportsFitRanges ? "Size charts turned on." : "Size charts turned off.",
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const reorder = useOptimisticReorder<ProductType>({
    queryKey: QUERY_KEY,
    reorderIds: (orderedIds) => productTypesApi.reorder(orderedIds),
  });

  const { getDragProps, moveEntry, draggingId, dragOverId } = useDragReorder({
    order: productTypes ?? [],
    getId: (productType) => productType.id,
    onReorder: (nextOrder) => reorder.mutate(nextOrder.map((productType) => productType.id)),
  });

  const submitProductType = form.handleSubmit((values) => create.mutate(values));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Garment types</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The list of clothing types a product can be. A new type reaches brands once it is on. Size
        charts let brands give each size a height and weight range; turn them off for types like
        bags or shoes, where height and weight say nothing about size.
      </p>

      {canManageCatalog && (
        <Form {...form}>
          <form
            onSubmit={submitProductType}
            noValidate
            className="mt-5 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem className="mt-0 w-56 space-y-1.5">
                  <FormLabel className="text-xs font-normal text-muted-foreground">Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Shoes"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        if (!slugTouched) {
                          form.setValue("slug", slugify(event.target.value), {
                            shouldValidate: form.formState.touchedFields.slug === true,
                          });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem className="mt-0 w-48 space-y-1.5">
                  <FormLabel className="text-xs font-normal text-muted-foreground">Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="shoes"
                      {...field}
                      onChange={(event) => {
                        field.onChange(slugify(event.target.value));
                        setSlugTouched(true);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" isLoading={create.isPending} className="mt-[22px]">
              Create type
            </Button>
          </form>
        </Form>
      )}

      {create.isError && <FormBanner className="mt-3">{getErrorMessage(create.error)}</FormBanner>}

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: DEFAULT_SKELETON_ROW_COUNT }).map((_, index) => (
            <ReorderRowSkeleton key={index} actionLabel="Switch off" />
          ))}
        {productTypes?.length === 0 && (
          <p className="text-sm text-muted-foreground">No garment types yet.</p>
        )}

        {productTypes?.map((productType, index) => {
          const {
            id,
            label: typeLabel,
            slug: typeSlug,
            isActive,
            supportsFitRanges,
            productCount,
          } = productType;

          return (
            <div
              key={id}
              {...(canManageCatalog ? getDragProps(id) : {})}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors",
                draggingId === id && "opacity-50",
                dragOverId === id && "border-foreground",
              )}
            >
              {canManageCatalog && (
                <>
                  <span
                    aria-hidden
                    className="cursor-grab text-muted-foreground active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" />
                  </span>
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Move ${typeLabel} up`}
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => moveEntry(index, index - 1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Move ${typeLabel} down`}
                      disabled={index === productTypes.length - 1 || reorder.isPending}
                      onClick={() => moveEntry(index, index + 1)}
                    >
                      <ArrowDown />
                    </Button>
                  </div>
                </>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-foreground">{typeLabel}</h2>
                  <Badge tone={isActive ? "positive" : "neutral"} showDot={false}>
                    {isActive ? "ON" : "OFF"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  /{typeSlug} · {productCount} products ·{" "}
                  {supportsFitRanges ? "Size charts on" : "Size charts off"}
                </p>
              </div>

              {canManageCatalog && (
                <Button
                  variant="ghost"
                  onClick={() => toggleSizeCharts.mutate(productType)}
                  disabled={toggleSizeCharts.isPending}
                  aria-label={`${supportsFitRanges ? "Turn off" : "Turn on"} size charts for ${typeLabel}`}
                >
                  {supportsFitRanges ? "Turn off size charts" : "Turn on size charts"}
                </Button>
              )}

              {canManageCatalog && (
                <Button
                  variant={isActive ? "ghost" : "default"}
                  onClick={() => toggleActive.mutate(productType)}
                  disabled={toggleActive.isPending}
                >
                  {isActive ? "Switch off" : "Switch on"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
