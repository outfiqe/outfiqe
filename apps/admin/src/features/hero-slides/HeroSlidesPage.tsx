import { Badge, Button, FormBanner, Input, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { ImageUpload } from "@/components/ImageUpload";
import { getErrorMessage } from "@/lib/errorMessages";

import { heroSlidesApi } from "./api";
import type { HeroSlide, HeroSlideStatusValue } from "./schemas";

const STATUS_TONE: Record<HeroSlideStatusValue, "neutral" | "positive"> = {
  DRAFT: "neutral",
  PUBLISHED: "positive",
};

const HERO_SLIDES_QUERY_KEY = ["admin-hero-slides"];

export const HeroSlidesPage = () => {
  const { data: heroSlides, isLoading } = useQuery({
    queryKey: HERO_SLIDES_QUERY_KEY,
    queryFn: heroSlidesApi.list,
  });

  const [tag, setTag] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageAssetId, setImageAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = useApiMutation({
    mutationFn: () =>
      heroSlidesApi.create({
        tag,
        title,
        description,
        ctaLabel,
        ctaHref,
        imageUrl: imageUrl ?? undefined,
        imageAssetId: imageAssetId ?? undefined,
      }),
    invalidateKeys: [HERO_SLIDES_QUERY_KEY],
    onSuccess: () => {
      setTag("");
      setTitle("");
      setDescription("");
      setCtaLabel("");
      setCtaHref("");
      setImageUrl(null);
      setImageAssetId(null);
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const toggleStatus = useApiMutation({
    mutationFn: (slide: HeroSlide) =>
      heroSlidesApi.setStatus(slide.id, slide.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"),
    invalidateKeys: [HERO_SLIDES_QUERY_KEY],
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
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Hero slides</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="slide-tag" className="text-xs text-muted-foreground">
            Tag
          </label>
          <Input
            id="slide-tag"
            required
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Collection 01: Festive"
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="slide-title" className="text-xs text-muted-foreground">
            Title
          </label>
          <Input
            id="slide-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dashain Edit '26"
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="slide-description" className="text-xs text-muted-foreground">
            Description
          </label>
          <Input
            id="slide-description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Styled full looks from Kathmandu labels."
            className="w-72"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="slide-cta-label" className="text-xs text-muted-foreground">
            CTA label
          </label>
          <Input
            id="slide-cta-label"
            required
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder="Explore collection"
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="slide-cta-href" className="text-xs text-muted-foreground">
            CTA link
          </label>
          <Input
            id="slide-cta-href"
            required
            value={ctaHref}
            onChange={(e) => setCtaHref(e.target.value)}
            placeholder="/collections/dashain-edit-26"
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <span className="block text-xs text-muted-foreground">Image</span>
          <ImageUpload
            value={imageUrl}
            onUploaded={({ url, imageAssetId: assetId }) => {
              setImageUrl(url);
              setImageAssetId(assetId);
            }}
          />
        </div>

        <Button type="submit" isLoading={create.isPending}>
          Create slide
        </Button>
      </form>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <CardRowSkeleton
              key={index}
              leadingImageClass="size-14"
              textLineCount={1}
              actionCount={1}
              actionSize="regular"
            />
          ))}
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
