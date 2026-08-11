import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { ImageUpload } from "@/components/ImageUpload";
import { Input } from "@/components/Input";
import { collectionsApi } from "./api";
import { ProductPicker } from "./ProductPicker";
import type { Collection, CollectionStatusValue } from "./schemas";

const STATUS_TONE: Record<CollectionStatusValue, "neutral" | "positive"> = {
  DRAFT: "neutral",
  PUBLISHED: "positive",
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const CollectionsPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: collectionsApi.list,
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      collectionsApi.create({
        name,
        slug,
        description: description || undefined,
        imageUrl: imageUrl ?? undefined,
      }),
    onSuccess: () => {
      setName("");
      setSlug("");
      setSlugTouched(false);
      setDescription("");
      setImageUrl(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-collections"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const toggleStatus = useMutation({
    mutationFn: (collection: Collection) =>
      collectionsApi.setStatus(
        collection.id,
        collection.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-collections"] }),
  });

  const setCollectionImage = useMutation({
    mutationFn: ({ id, imageUrl: url }: { id: string; imageUrl: string }) =>
      collectionsApi.setImage(id, url),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-collections"] }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Collections</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="collection-name" className="text-xs text-muted-foreground">
            Name
          </label>
          <Input
            id="collection-name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Dashain Edit"
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="collection-slug" className="text-xs text-muted-foreground">
            Slug
          </label>
          <Input
            id="collection-slug"
            required
            value={slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setSlugTouched(true);
            }}
            placeholder="dashain-edit"
            className="w-48"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="collection-description" className="text-xs text-muted-foreground">
            Description
          </label>
          <Input
            id="collection-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className="w-72"
          />
        </div>
        <div className="space-y-1.5">
          <span className="block text-xs text-muted-foreground">Image</span>
          <ImageUpload value={imageUrl} onChange={setImageUrl} />
        </div>

        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create collection"}
        </Button>
      </form>

      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">No collections yet.</p>}

        {data?.map((collection) => (
          <div key={collection.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <ImageUpload
                value={collection.imageUrl}
                onChange={(url) => setCollectionImage.mutate({ id: collection.id, imageUrl: url })}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-foreground">
                    {collection.name}
                  </h2>
                  <Badge tone={STATUS_TONE[collection.status]}>{collection.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  /{collection.slug} · {collection.productCount} products
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => setManagingId((id) => (id === collection.id ? null : collection.id))}
              >
                {managingId === collection.id ? "Close" : "Manage products"}
              </Button>
              <Button
                variant={collection.status === "PUBLISHED" ? "ghost" : "primary"}
                onClick={() => toggleStatus.mutate(collection)}
                disabled={toggleStatus.isPending}
              >
                {collection.status === "PUBLISHED" ? "Unpublish" : "Publish"}
              </Button>
            </div>

            {managingId === collection.id && (
              <ProductPicker collection={collection} onClose={() => setManagingId(null)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
