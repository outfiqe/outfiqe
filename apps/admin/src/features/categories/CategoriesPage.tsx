import { Badge, Button, cn, FormBanner, Input } from "@outfiqe/design-system";
import { useDragReorder } from "@outfiqe/hooks";
import { LANDING_TASTE_CATEGORY_COUNT } from "@outfiqe/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { type FormEvent, useState } from "react";

import { ImageUpload } from "@/components/ImageUpload";

import { categoriesApi } from "./api";
import type { Category, CategoryStatusValue } from "./schemas";

const STATUS_TONE: Record<CategoryStatusValue, "neutral" | "positive"> = {
  DRAFT: "neutral",
  PUBLISHED: "positive",
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => categoriesApi.create({ name, slug, imageUrl: imageUrl ?? undefined }),
    onSuccess: () => {
      setName("");
      setSlug("");
      setSlugTouched(false);
      setImageUrl(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const toggleStatus = useMutation({
    mutationFn: (category: Category) =>
      categoriesApi.setStatus(category.id, category.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const setCategoryImage = useMutation({
    mutationFn: ({ id, imageUrl: url }: { id: string; imageUrl: string }) =>
      categoriesApi.setImage(id, url),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Categories</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="category-name" className="text-xs text-muted-foreground">
            Name
          </label>
          <Input
            id="category-name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Old Money"
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="category-slug" className="text-xs text-muted-foreground">
            Slug
          </label>
          <Input
            id="category-slug"
            required
            value={slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setSlugTouched(true);
            }}
            placeholder="old-money"
            className="w-48"
          />
        </div>
        <div className="space-y-1.5">
          <span className="block text-xs text-muted-foreground">Image</span>
          <ImageUpload value={imageUrl} onChange={setImageUrl} />
        </div>

        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create category"}
        </Button>
      </form>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <p className="mt-6 text-sm text-muted-foreground">
        New visitors see the first {LANDING_TASTE_CATEGORY_COUNT} categories on the landing page.
        Arrange them here — the order also applies everywhere else the list is shown.
      </p>

      <div className="mt-3 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
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
