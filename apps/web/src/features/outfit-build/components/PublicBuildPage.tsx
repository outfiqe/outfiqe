"use client";

import type { PublicBuildDetail } from "../api/outfitSocialSchemas";
import { usePublicBuild } from "../hooks/useBuildSocial";
import { PublicBuildDetailView } from "./PublicBuildDetailView";

export const PublicBuildPage = ({ initialBuild }: { initialBuild: PublicBuildDetail }) => {
  const { data: build = initialBuild } = usePublicBuild(initialBuild.id, initialBuild);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PublicBuildDetailView build={build} />
    </div>
  );
};
