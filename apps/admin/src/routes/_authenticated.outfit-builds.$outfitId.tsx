import { createFileRoute, useParams } from "@tanstack/react-router";

import { OutfitBuildDetailPage } from "@/features/outfit-builds/components/OutfitBuildDetailPage";

const OutfitBuildDetailRoute = () => {
  const { outfitId } = useParams({ from: "/_authenticated/outfit-builds/$outfitId" });
  return <OutfitBuildDetailPage outfitId={outfitId} />;
};

export const Route = createFileRoute("/_authenticated/outfit-builds/$outfitId")({
  component: OutfitBuildDetailRoute,
});
