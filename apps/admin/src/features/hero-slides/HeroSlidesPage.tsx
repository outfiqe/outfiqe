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
import { useForm } from "react-hook-form";

import { ImageUpload } from "@/components/ImageUpload";
import { ImageUploadSkeleton } from "@/components/ImageUploadSkeleton";
import { SkeletonBadge, SkeletonButton } from "@/components/SkeletonControls";
import { getErrorMessage } from "@/lib/errorMessages";

import { heroSlidesApi } from "./api";
import {
  EMPTY_HERO_SLIDE_FORM,
  heroSlideFormSchema,
  type HeroSlideFormValues,
} from "./heroSlideForm.schema";
import type { HeroSlide, HeroSlideStatusValue } from "./schemas";

const STATUS_TONE: Record<HeroSlideStatusValue, "neutral" | "positive"> = {
  DRAFT: "neutral",
  PUBLISHED: "positive",
};

const HERO_SLIDES_QUERY_KEY = ["admin-hero-slides"];

const HeroSlideRowSkeleton = () => (
  <div
    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
    aria-hidden
  >
    <ImageUploadSkeleton />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-40" />
        <SkeletonBadge />
      </div>
      <Skeleton className="mt-1 h-5 w-72 max-w-full" />
    </div>
    <SkeletonButton variant="ghost" label="Unpublish" />
  </div>
);

export const HeroSlidesPage = () => {
  const { data: heroSlides, isLoading } = useQuery({
    queryKey: HERO_SLIDES_QUERY_KEY,
    queryFn: heroSlidesApi.list,
  });

  const form = useForm<HeroSlideFormValues>({
    resolver: zodResolver(heroSlideFormSchema),
    defaultValues: EMPTY_HERO_SLIDE_FORM,
    mode: "onTouched",
  });

  const create = useApiMutation({
    mutationFn: (values: HeroSlideFormValues) =>
      heroSlidesApi.create({
        tag: values.tag,
        title: values.title,
        description: values.description,
        ctaLabel: values.ctaLabel,
        ctaHref: values.ctaHref,
        imageUrl: values.imageUrl ?? undefined,
        imageAssetId: values.imageAssetId ?? undefined,
      }),
    invalidateKeys: [HERO_SLIDES_QUERY_KEY],
    successMessage: "Hero slide created.",
    onSuccess: () => form.reset(EMPTY_HERO_SLIDE_FORM),
  });

  const toggleStatus = useApiMutation({
    mutationFn: (slide: HeroSlide) =>
      heroSlidesApi.setStatus(slide.id, slide.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"),
    invalidateKeys: [HERO_SLIDES_QUERY_KEY],
    successMessage: (updated) =>
      updated.status === "PUBLISHED" ? "Hero slide published." : "Hero slide unpublished.",
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const setSlideImage = useApiMutation({
    mutationFn: ({
      id,
      imageUrl: url,
      imageAssetId: assetId,
    }: {
      id: string;
      imageUrl: string;
      imageAssetId: string;
    }) => heroSlidesApi.setImage(id, url, assetId),
    invalidateKeys: [HERO_SLIDES_QUERY_KEY],
    successMessage: "Hero slide image updated.",
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const submitHeroSlide = form.handleSubmit((values) => create.mutate(values));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Hero slides</h1>

      <Form {...form}>
        <form
          onSubmit={submitHeroSlide}
          noValidate
          className="mt-5 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
        >
          <FormField
            control={form.control}
            name="tag"
            render={({ field }) => (
              <FormItem className="w-56 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">Tag</FormLabel>
                <FormControl>
                  <Input placeholder="Collection 01: Festive" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="w-56 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">Title</FormLabel>
                <FormControl>
                  <Input placeholder="Dashain Edit '26" {...field} />
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
                  <Input placeholder="Styled full looks from Kathmandu labels." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ctaLabel"
            render={({ field }) => (
              <FormItem className="w-44 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">
                  CTA label
                </FormLabel>
                <FormControl>
                  <Input placeholder="Explore collection" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ctaHref"
            render={({ field }) => (
              <FormItem className="w-56 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">
                  CTA link
                </FormLabel>
                <FormControl>
                  <Input placeholder="/collections/dashain-edit-26" {...field} />
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
            Create slide
          </Button>
        </form>
      </Form>

      {create.isError && <FormBanner className="mt-3">{getErrorMessage(create.error)}</FormBanner>}

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => <HeroSlideRowSkeleton key={index} />)}
        {heroSlides?.length === 0 && (
          <p className="text-sm text-muted-foreground">No hero slides yet.</p>
        )}

        {heroSlides?.map((slide) => {
          const { id, imageUrl, title, status, tag, ctaLabel, ctaHref } = slide;

          return (
            <div
              key={id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              <ImageUpload
                value={imageUrl}
                onUploaded={({ url, imageAssetId: assetId }) =>
                  setSlideImage.mutate({ id, imageUrl: url, imageAssetId: assetId })
                }
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
                  <Badge tone={STATUS_TONE[status]} showDot={false}>
                    {status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tag} · {ctaLabel} → {ctaHref}
                </p>
              </div>

              <Button
                variant={status === "PUBLISHED" ? "ghost" : "default"}
                onClick={() => toggleStatus.mutate(slide)}
                disabled={toggleStatus.isPending}
              >
                {status === "PUBLISHED" ? "Unpublish" : "Publish"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
