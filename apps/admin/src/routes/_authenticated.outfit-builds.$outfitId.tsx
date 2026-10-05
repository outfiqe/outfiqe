import { createFileRoute, useParams } from "@tanstack/react-router";

import { OutfitBuildDetailPage } from "@/features/outfit-builds/OutfitBuildDetailPage";

const OutfitBuildDetailRoute = () => {
  const { outfitId } = useParams({ from: "/_authenticated/outfit-builds/$outfitId" });
  return <OutfitBuildDetailPage outfitId={outfitId} />;
};

export const Route = createFileRoute("/_authenticated/outfit-builds/$outfitId")({
  component: OutfitBuildDetailRoute,
});
