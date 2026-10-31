"use client";

import { Modal } from "@outfiqe/design-system";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { usePublicBuild } from "../../social/hooks/useBuildSocial";
import { BuildDetailSkeleton } from "./BuildDetailSkeleton";
import { PublicBuildDetailView } from "./PublicBuildDetailView";

const STEADY_MODAL_CLASS_NAME = "h-[85dvh] sm:max-w-3xl";

export const BuildDetailModal = ({
  outfitId,
  title,
  onClose,
}: {
  outfitId: string;
  title: string;
  onClose: () => void;
}) => {
  const t = useTranslations("outfitBuild.public");
  const { data: build, isPending, isError } = usePublicBuild(outfitId);

  return (
    <Modal open onClose={onClose} title={build?.title ?? title} className={STEADY_MODAL_CLASS_NAME}>
      {isPending && <BuildDetailSkeleton />}
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
