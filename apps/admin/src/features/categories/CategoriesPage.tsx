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
import { LANDING_TASTE_CATEGORY_COUNT } from "@outfiqe/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ImageUpload } from "@/components/ImageUpload";
import { ReorderRowSkeleton } from "@/components/ReorderRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";
import { slugify } from "@/lib/slugify";

import { categoriesApi } from "./api";
import {
  categoryFormSchema,
  type CategoryFormValues,
  EMPTY_CATEGORY_FORM,
} from "./categoryForm.schema";
import type { Category, CategoryStatusValue } from "./schemas";

const STATUS_TONE: Record<CategoryStatusValue, "neutral" | "positive"> = {
  DRAFT: "neutral",
  PUBLISHED: "positive",
};

export const CategoriesPage = () => {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: categoriesApi.list,
  });
  const { data: popularity } = useQuery({
    queryKey: ["admin-category-popularity"],
    queryFn: categoriesApi.popularity,
  });
  const shopperCountBySlug = new Map((popularity ?? []).map((row) => [row.slug, row.userCount]));

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: EMPTY_CATEGORY_FORM,
    mode: "onTouched",
  });
  const [slugTouched, setSlugTouched] = useState(false);

  const CATEGORIES_QUERY_KEY = ["admin-categories"];

  const create = useApiMutation({
    mutationFn: (values: CategoryFormValues) =>
      categoriesApi.create({
        name: values.name,
        slug: values.slug,
        imageUrl: values.imageUrl ?? undefined,
      }),
    invalidateKeys: [CATEGORIES_QUERY_KEY],
    successMessage: "Category created.",
    onSuccess: () => {
      form.reset(EMPTY_CATEGORY_FORM);
      setSlugTouched(false);
    },
  });

  const toggleStatus = useApiMutation({
    mutationFn: (category: Category) =>
      categoriesApi.setStatus(category.id, category.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"),
    invalidateKeys: [CATEGORIES_QUERY_KEY],
    successMessage: (category) =>
      category.status === "PUBLISHED" ? "Category published." : "Category unpublished.",
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const setCategoryImage = useApiMutation({
    mutationFn: ({ id, imageUrl: url }: { id: string; imageUrl: string }) =>
      categoriesApi.setImage(id, url),
    invalidateKeys: [CATEGORIES_QUERY_KEY],
    successMessage: "Category image updated.",
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => categoriesApi.reorder(orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ["admin-categories"] });
      const previous = queryClient.getQueryData<Category[]>(["admin-categories"]);
      if (previous) {
        const byId = new Map(previous.map((category) => [category.id, category]));
        queryClient.setQueryData(
          ["admin-categories"],
          orderedIds
            .map((id) => byId.get(id))
            .filter((category): category is Category => !!category),
        );
      }
      return { previous };
    },
    onError: (_error, _orderedIds, context) => {
      if (context?.previous) queryClient.setQueryData(["admin-categories"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const { getDragProps, moveEntry, draggingId, dragOverId } = useDragReorder({
    order: categories ?? [],
    getId: (category) => category.id,
    onReorder: (nextOrder) => reorder.mutate(nextOrder.map((category) => category.id)),
  });

  const publishedCount = (categories ?? []).filter(
    (category) => category.status === "PUBLISHED",
  ).length;
  const landingCutoffId =
    publishedCount > LANDING_TASTE_CATEGORY_COUNT
      ? (categories ?? []).filter((category) => category.status === "PUBLISHED")[
          LANDING_TASTE_CATEGORY_COUNT - 1
        ]?.id
      : null;

  const submitCategory = form.handleSubmit((values) => create.mutate(values));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Categories</h1>

      <Form {...form}>
        <form
          onSubmit={submitCategory}
          noValidate
          className="mt-5 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="mt-0 w-56 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Old Money"
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
                    placeholder="old-money"
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
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <span className="block text-xs text-muted-foreground">Image</span>
                <ImageUpload value={field.value} onChange={field.onChange} />
              </FormItem>
            )}
          />

          <Button type="submit" isLoading={create.isPending} className="mt-[22px]">
            Create category
          </Button>
        </form>
      </Form>

      {create.isError && <FormBanner className="mt-3">{getErrorMessage(create.error)}</FormBanner>}

      <p className="mt-6 text-sm text-muted-foreground">
        New visitors see the first {LANDING_TASTE_CATEGORY_COUNT} categories on the landing page.
        Arrange them here — the order also applies everywhere else the list is shown.
      </p>

      <div className="mt-3 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => <ReorderRowSkeleton key={index} hasImage />)}
        {categories?.length === 0 && (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        )}

        {categories?.map((category, index) => {
          const { id, imageUrl, name, status, slug, productCount } = category;
          const isLandingCutoff = id === landingCutoffId;

          return (
            <div key={id}>
              <div
                {...getDragProps(id)}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors",
                  draggingId === id && "opacity-50",
                  dragOverId === id && "border-foreground",
                )}
              >
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
                    aria-label={`Move ${name} up`}
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => moveEntry(index, index - 1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Move ${name} down`}
                    disabled={index === categories.length - 1 || reorder.isPending}
                    onClick={() => moveEntry(index, index + 1)}
                  >
                    <ArrowDown />
                  </Button>
                </div>

                <ImageUpload
                  value={imageUrl}
                  onChange={(url) => setCategoryImage.mutate({ id, imageUrl: url })}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-bold text-foreground">{name}</h2>
                    <Badge tone={STATUS_TONE[status]} showDot={false}>
                      {status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    /{slug} · {productCount} products · {shopperCountBySlug.get(slug) ?? 0} shoppers
                    pinned this
                  </p>
                </div>

                <Button
                  variant={status === "PUBLISHED" ? "ghost" : "default"}
                  onClick={() => toggleStatus.mutate(category)}
                  disabled={toggleStatus.isPending}
                >
                  {status === "PUBLISHED" ? "Unpublish" : "Publish"}
                </Button>
              </div>

              {isLandingCutoff && (
                <p className="mt-3 border-t border-dashed border-border pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Landing page shows published categories down to here
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
