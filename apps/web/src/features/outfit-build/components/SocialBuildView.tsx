"use client";

import { Skeleton } from "@outfiqe/design-system";
import type { ReactNode } from "react";

import { usePublicBuild } from "../hooks/useBuildSocial";
import { PublicBuildDetailView } from "./PublicBuildDetailView";

export const SocialBuildView = ({
  outfitId,
  fallback,
}: {
  outfitId: string;
  fallback: ReactNode;
}) => {
  const { data: build, isPending, isError } = usePublicBuild(outfitId);

  if (isPending) return <Skeleton className="mx-auto h-64 max-w-3xl rounded-xl" />;
  if (isError || !build) return fallback;
  return (
    <div className="mx-auto max-w-3xl">
      <PublicBuildDetailView build={build} />
    </div>
  );
};
