import { Badge, Button, FormBanner, Input } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { ImageUpload } from "@/components/ImageUpload";

import { heroSlidesApi } from "./api";
import type { HeroSlide, HeroSlideStatusValue } from "./schemas";

const STATUS_TONE: Record<HeroSlideStatusValue, "neutral" | "positive"> = {
  DRAFT: "neutral",
  PUBLISHED: "positive",
};

export const HeroSlidesPage = () => {
  const queryClient = useQueryClient();
  const { data: heroSlides, isLoading } = useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: heroSlidesApi.list,
  });

  const [tag, setTag] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      heroSlidesApi.create({
        tag,
        title,
        description,
        ctaLabel,
        ctaHref,
        imageUrl: imageUrl ?? undefined,
      }),
    onSuccess: () => {
      setTag("");
      setTitle("");
      setDescription("");
      setCtaLabel("");
      setCtaHref("");
      setImageUrl(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const toggleStatus = useMutation({
    mutationFn: (slide: HeroSlide) =>
      heroSlidesApi.setStatus(slide.id, slide.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] }),
  });

  const setSlideImage = useMutation({
    mutationFn: ({ id, imageUrl: url }: { id: string; imageUrl: string }) =>
      heroSlidesApi.setImage(id, url),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] }),
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
          <ImageUpload value={imageUrl} onChange={setImageUrl} />
        </div>

        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create slide"}
        </Button>
      </form>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
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
                onChange={(url) => setSlideImage.mutate({ id, imageUrl: url })}
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
