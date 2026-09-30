import type { Metadata } from "next";

import { BuildPage } from "@/features/outfit-build";

import { requireAuthedSession } from "../../(dashboard)/requireDashboardSession";

export const metadata: Metadata = { title: "Outfit build", robots: { index: false } };

const BuildRoute = async ({ params }: { params: Promise<{ outfitId: string }> }) => {
  const { outfitId } = await params;
  await requireAuthedSession(`/builds/${outfitId}`);
  return (
    <main>
      <BuildPage outfitId={outfitId} />
    </main>
  );
};

export default BuildRoute;
