import { Badge, Button, cn, FormBanner, Input } from "@outfiqe/design-system";
import { useDragReorder } from "@outfiqe/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { type FormEvent, useState } from "react";

import { productTypesApi } from "./api";
import type { ProductType } from "./schemas";

const QUERY_KEY = ["admin-product-types"];

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const ProductTypesPage = () => {
  const queryClient = useQueryClient();
  const { data: productTypes, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: productTypesApi.list,
  });

  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const create = useMutation({
    mutationFn: () => productTypesApi.create({ label, slug }),
    onSuccess: () => {
      setLabel("");
      setSlug("");
      setSlugTouched(false);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const toggleActive = useMutation({
    mutationFn: (productType: ProductType) =>
      productTypesApi.setActive(productType.id, !productType.isActive),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => productTypesApi.reorder(orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<ProductType[]>(QUERY_KEY);
      if (previous) {
        const byId = new Map(previous.map((productType) => [productType.id, productType]));
        queryClient.setQueryData(
          QUERY_KEY,
          orderedIds
            .map((id) => byId.get(id))
            .filter((productType): productType is ProductType => !!productType),
        );
      }
      return { previous };
    },
    onError: (_error, _orderedIds, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
    },
    onSettled: invalidate,
  });

  const { getDragProps, moveEntry, draggingId, dragOverId } = useDragReorder({
    order: productTypes ?? [],
    getId: (productType) => productType.id,
    onReorder: (nextOrder) => reorder.mutate(nextOrder.map((productType) => productType.id)),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Garment types</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The list of clothing types a product can be. A new type reaches brands once it is on and has
        at least one size.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="product-type-label" className="text-xs text-muted-foreground">
            Name
          </label>
          <Input
            id="product-type-label"
            required
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Shoes"
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="product-type-slug" className="text-xs text-muted-foreground">
            Slug
          </label>
          <Input
            id="product-type-slug"
            required
            value={slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setSlugTouched(true);
            }}
            placeholder="shoes"
            className="w-48"
          />
        </div>

        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create type"}
        </Button>
      </form>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {productTypes?.length === 0 && (
          <p className="text-sm text-muted-foreground">No garment types yet.</p>
        )}

        {productTypes?.map((productType, index) => {
          const {
            id,
            label: typeLabel,
            slug: typeSlug,
            isActive,
            productCount,
            sizeOptionCount,
          } = productType;

          return (
            <div
              key={id}
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

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-foreground">{typeLabel}</h2>
                  <Badge tone={isActive ? "positive" : "neutral"} showDot={false}>
                    {isActive ? "ON" : "OFF"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  /{typeSlug} · {productCount} products · {sizeOptionCount} sizes
                  {sizeOptionCount === 0 && (
                    <>
                      {" · "}
                      <Link
                        to="/size-options"
                        className="font-medium text-foreground underline underline-offset-2"
                      >
                        Add sizes
                      </Link>
                    </>
                  )}
                </p>
              </div>

              <Button
                variant={isActive ? "ghost" : "default"}
                onClick={() => toggleActive.mutate(productType)}
                disabled={toggleActive.isPending}
              >
                {isActive ? "Switch off" : "Switch on"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
