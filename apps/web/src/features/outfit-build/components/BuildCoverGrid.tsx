"use client";

import { useTranslations } from "next-intl";

import { AppImage } from "@/shared/components/AppImage";
import { cn } from "@/shared/lib/cn";
import type { ResponsiveImage } from "@/shared/lib/responsiveImage";

const PREVIEW_IMAGE_COUNT = 3;
const LEAD_PREVIEW_INDEX = 0;
const NO_IMAGES = 0;
const SINGLE_IMAGE = 1;

type BuildCoverGridProps = {
  coverPhotos: { id: string; image: ResponsiveImage }[];
  previewImageUrls: string[];
  itemCount: number;
  emptyLabel: string;
  sizes: string;
  className?: string;
};

export const BuildCoverGrid = ({
  coverPhotos,
  previewImageUrls,
  itemCount,
  emptyLabel,
  sizes,
  className,
}: BuildCoverGridProps) => {
  const t = useTranslations("outfitBuild.myBuilds");
  const tPhotos = useTranslations("outfitBuild.photos");
  const leadCovers = coverPhotos.slice(0, PREVIEW_IMAGE_COUNT);
  const previewImages = previewImageUrls.slice(0, PREVIEW_IMAGE_COUNT);
  const isShowingCovers = leadCovers.length > NO_IMAGES;
  const shownImageCount = isShowingCovers ? leadCovers.length : previewImages.length;
  const extraItemCount = itemCount - previewImages.length;
  const leadCellClass = (index: number) =>
    index === LEAD_PREVIEW_INDEX && shownImageCount > SINGLE_IMAGE
      ? "relative row-span-2"
      : "relative";

  return (
    <div
      className={cn(
        "relative grid grid-cols-2 grid-rows-2 gap-0.5 bg-muted",
        shownImageCount === SINGLE_IMAGE && "grid-cols-1 grid-rows-1",
        className,
      )}
    >
      {isShowingCovers
        ? leadCovers.map(({ id, image }, index) => (
            <span key={id} className={leadCellClass(index)}>
              <AppImage
                image={image}
                src={image.url}
                alt={tPhotos("coverAlt")}
                fill
                sizes={sizes}
              />
            </span>
          ))
        : previewImages.map((imageUrl, index) => (
            <span key={imageUrl} className={leadCellClass(index)}>
              <AppImage src={imageUrl} alt="" fill sizes={sizes} />
            </span>
          ))}
      {shownImageCount === NO_IMAGES && (
        <span className="col-span-2 row-span-2 flex items-center justify-center text-sm text-muted-foreground">
          {emptyLabel}
        </span>
      )}
      {!isShowingCovers && extraItemCount > NO_IMAGES && (
        <span className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground">
          {t("moreItems", { count: extraItemCount })}
        </span>
      )}
    </div>
  );
};
