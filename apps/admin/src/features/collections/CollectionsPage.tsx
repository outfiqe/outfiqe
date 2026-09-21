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
  Skeleton,
  toast,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ImageUpload } from "@/components/ImageUpload";
import { ImageUploadSkeleton } from "@/components/ImageUploadSkeleton";
import { SkeletonBadge, SkeletonButton } from "@/components/SkeletonControls";
import { getErrorMessage } from "@/lib/errorMessages";
import { slugify } from "@/lib/slugify";

import { collectionsApi } from "./api";
import {
  collectionFormSchema,
  type CollectionFormValues,
  EMPTY_COLLECTION_FORM,
} from "./collectionForm.schema";
import { ProductPicker } from "./ProductPicker";
import type { Collection, CollectionStatusValue } from "./schemas";

const STATUS_TONE: Record<CollectionStatusValue, "neutral" | "positive"> = {
  DRAFT: "neutral",
  PUBLISHED: "positive",
};

const COLLECTIONS_QUERY_KEY = ["admin-collections"];

const CollectionRowSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-4" aria-hidden>
    <div className="flex flex-wrap items-center gap-3">
      <ImageUploadSkeleton />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-40" />
          <SkeletonBadge />
        </div>
        <Skeleton className="mt-1 h-5 w-56" />
      </div>
      <SkeletonButton label="Manage products" />
      <SkeletonButton variant="ghost" label="Unpublish" />
    </div>
  </div>
);

export const CollectionsPage = () => {
  const { data: collections, isLoading } = useQuery({
    queryKey: COLLECTIONS_QUERY_KEY,
    queryFn: collectionsApi.list,
  });

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: EMPTY_COLLECTION_FORM,
    mode: "onTouched",
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);

  const create = useApiMutation({
    mutationFn: (values: CollectionFormValues) =>
      collectionsApi.create({
        name: values.name,
        slug: values.slug,
        description: values.description || undefined,
        imageUrl: values.imageUrl ?? undefined,
        imageAssetId: values.imageAssetId ?? undefined,
      }),
    invalidateKeys: [COLLECTIONS_QUERY_KEY],
    successMessage: "Collection created.",
    onSuccess: () => {
      form.reset(EMPTY_COLLECTION_FORM);
      setSlugTouched(false);
    },
  });

  const toggleStatus = useApiMutation({
    mutationFn: (collection: Collection) =>
      collectionsApi.setStatus(
        collection.id,
        collection.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
      ),
    invalidateKeys: [COLLECTIONS_QUERY_KEY],
    successMessage: (updated) =>
      updated.status === "PUBLISHED" ? "Collection published." : "Collection unpublished.",
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const setCollectionImage = useApiMutation({
    mutationFn: ({
      id,
      imageUrl: url,
      imageAssetId: assetId,
    }: {
      id: string;
      imageUrl: string;
      imageAssetId: string;
    }) => collectionsApi.setImage(id, url, assetId),
    invalidateKeys: [COLLECTIONS_QUERY_KEY],
    successMessage: "Collection image updated.",
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const submitCollection = form.handleSubmit((values) => create.mutate(values));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Collections</h1>

      <Form {...form}>
        <form
          onSubmit={submitCollection}
          noValidate
          className="mt-5 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-56 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Dashain Edit"
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
              <FormItem className="w-48 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">Slug</FormLabel>
                <FormControl>
                  <Input
                    placeholder="dashain-edit"
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
            name="description"
            render={({ field }) => (
              <FormItem className="w-72 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">
                  Description
                </FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <span className="block text-xs text-muted-foreground">Image</span>
                <ImageUpload
                  value={field.value}
                  onUploaded={({ url, imageAssetId: assetId }) => {
                    field.onChange(url);
                    form.setValue("imageAssetId", assetId);
                  }}
                />
              </FormItem>
            )}
          />

          <Button type="submit" isLoading={create.isPending} className="mt-[22px]">
            Create collection
          </Button>
        </form>
      </Form>

      {create.isError && <FormBanner className="mt-3">{getErrorMessage(create.error)}</FormBanner>}

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => <CollectionRowSkeleton key={index} />)}
        {collections?.length === 0 && (
          <p className="text-sm text-muted-foreground">No collections yet.</p>
        )}

        {collections?.map((collection) => {
          const { id, imageUrl, name, status, slug, productCount } = collection;

          return (
            <div key={id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <ImageUpload
                  value={imageUrl}
                  onUploaded={({ url, imageAssetId: assetId }) =>
                    setCollectionImage.mutate({ id, imageUrl: url, imageAssetId: assetId })
                  }
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-bold text-foreground">{name}</h2>
                    <Badge tone={STATUS_TONE[status]} showDot={false}>
                      {status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    /{slug} · {productCount} products
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setManagingId((currentId) => (currentId === id ? null : id))}
                >
                  {managingId === id ? "Close" : "Manage products"}
                </Button>
                <Button
                  variant={status === "PUBLISHED" ? "ghost" : "default"}
                  onClick={() => toggleStatus.mutate(collection)}
                  disabled={toggleStatus.isPending}
                >
                  {status === "PUBLISHED" ? "Unpublish" : "Publish"}
                </Button>
              </div>

              {managingId === id && (
                <ProductPicker collection={collection} onClose={() => setManagingId(null)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
