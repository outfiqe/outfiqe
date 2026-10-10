"use client";

import type { PublicBuildDetail } from "../../social/api/outfitSocialSchemas";
import { usePublicBuild } from "../../social/hooks/useBuildSocial";
import { PublicBuildDetailView } from "./PublicBuildDetailView";

export const PublicBuildPage = ({ initialBuild }: { initialBuild: PublicBuildDetail }) => {
  const { data: build = initialBuild } = usePublicBuild(initialBuild.id, initialBuild);
  return (
    <div className="mx-auto max-w-3xl">
      <PublicBuildDetailView build={build} />
    </div>
  );
};
