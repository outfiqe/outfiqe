"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { ReportContentModal } from "@/features/explore/posts/components/ReportContentModal";
import { useReportContent } from "@/features/explore/posts/hooks/useReportContent";
import { AppImage } from "@/shared/components/AppImage";

import type { OutfitPhoto } from "../../api/outfitSchemas";

const NO_PHOTOS = 0;
const UNPLACED_COVER_POSITION = Number.POSITIVE_INFINITY;
const PHOTO_SIZE = "(min-width: 1024px) 200px, 45vw";

type PublicBuildPhotosProps = {
  photos: OutfitPhoto[];
  canReport: boolean;
};

const coversFirst = (photos: OutfitPhoto[]): OutfitPhoto[] =>
  [...photos].sort(
    (left, right) =>
      (left.coverPosition ?? UNPLACED_COVER_POSITION) -
      (right.coverPosition ?? UNPLACED_COVER_POSITION),
  );

const PhotoGallery = ({
  title,
  photos,
  canReport,
  onReport,
}: {
  title: string;
  photos: OutfitPhoto[];
  canReport: boolean;
  onReport: (photoId: string) => void;
}) => {
  const t = useTranslations("outfitBuild.photos");
  const titleId = useId();
  if (photos.length === NO_PHOTOS) return null;

  return (
    <section aria-labelledby={titleId} className="space-y-2">
      <h2 id={titleId} className="text-sm font-semibold text-foreground">
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo) => (
          <li key={photo.id} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
            <AppImage
              image={photo.image}
              src={photo.image.url}
              alt={photo.uploadedBy ? t("photoBy", { name: photo.uploadedBy.name }) : t("photoAlt")}
              fill
              sizes={PHOTO_SIZE}
            />
            {canReport && (
              <button
                type="button"
                aria-label={t("report")}
                onClick={() => onReport(photo.id)}
                className="absolute right-1 top-1 cursor-pointer rounded-full bg-background/80 p-1.5 text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
              >
                <Flag className="size-3.5" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export const PublicBuildPhotos = ({ photos, canReport }: PublicBuildPhotosProps) => {
  const t = useTranslations("outfitBuild.photos");
  const [reportingPhotoId, setReportingPhotoId] = useState<string | null>(null);
  const reportPhoto = useReportContent(() => setReportingPhotoId(null));
  const buildPhotos = coversFirst(photos.filter(({ kind }) => kind === "COVER"));
  const tryOnPhotos = photos.filter(({ kind }) => kind === "TRY_ON");

  return (
    <>
      <PhotoGallery
        title={t("title")}
        photos={buildPhotos}
        canReport={canReport}
        onReport={setReportingPhotoId}
      />
      <PhotoGallery
        title={t("tryOnTitle")}
        photos={tryOnPhotos}
        canReport={canReport}
        onReport={setReportingPhotoId}
      />
      {reportingPhotoId && (
        <ReportContentModal
          targetLabel="photo"
          isPending={reportPhoto.isPending}
          onCancel={() => setReportingPhotoId(null)}
          onConfirm={({ reason, note }) =>
            reportPhoto.mutate({
              targetType: "OUTFIT_PHOTO",
              targetId: reportingPhotoId,
              reason,
              note,
            })
          }
        />
      )}
    </>
  );
};
