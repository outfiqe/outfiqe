import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { ImageUpload } from "@/components/ImageUpload";
import { Input } from "@/components/Input";
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
  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: categoriesApi.list,
  });

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

      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}

        {data?.map((category) => (
          <div
            key={category.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
          >
            <ImageUpload
              value={category.imageUrl}
              onChange={(url) => setCategoryImage.mutate({ id: category.id, imageUrl: url })}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-foreground">
                  {category.name}
                </h2>
                <Badge tone={STATUS_TONE[category.status]}>{category.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                /{category.slug} · {category.productCount} products
              </p>
            </div>

            <Button
              variant={category.status === "PUBLISHED" ? "ghost" : "primary"}
              onClick={() => toggleStatus.mutate(category)}
              disabled={toggleStatus.isPending}
            >
              {category.status === "PUBLISHED" ? "Unpublish" : "Publish"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
