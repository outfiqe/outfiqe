"use client";

import { Modal, Skeleton } from "@outfiqe/design-system";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { usePublicBuild } from "../../social/hooks/useBuildSocial";
import { PublicBuildDetailView } from "./PublicBuildDetailView";

export const BuildDetailModal = ({
  outfitId,
  onClose,
}: {
  outfitId: string;
  onClose: () => void;
}) => {
  const t = useTranslations("outfitBuild.public");
  const { data: build, isPending, isError } = usePublicBuild(outfitId);

  return (
    <Modal open onClose={onClose} title={build?.title ?? t("buildTitle")} className="sm:max-w-3xl">
      {isPending && <Skeleton className="h-64 w-full rounded-xl" />}
      {isError && <p className="text-sm text-destructive">{t("buildFailed")}</p>}
      {build && (
        <div className="space-y-3">
          <PublicBuildDetailView build={build} headingLevel="h2" />
          <Link
            href={`/builds/${outfitId}`}
            className="inline-block text-sm font-medium text-foreground underline underline-offset-4"
          >
            {t("openFullPage")}
          </Link>
        </div>
      )}
    </Modal>
  );
};
