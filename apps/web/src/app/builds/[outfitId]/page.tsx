import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerSessionWithToken } from "@/features/auth/api/serverAuth";
import { BuildPage, PublicBuildPage } from "@/features/outfit-build";
import { getPublicBuildServer } from "@/features/outfit-build/public-builds/api/getPublicBuildServer";
import { buildPageMetadata } from "@/shared/seo";

type BuildRouteProps = { params: Promise<{ outfitId: string }> };

const BUILD_FALLBACK_TITLE = "Outfit build";

const PRIVATE_BUILD_METADATA: Metadata = { title: BUILD_FALLBACK_TITLE, robots: { index: false } };

const describeBuild = (itemCount: number, total: number, contributorNames: string): string => {
  const credit = contributorNames ? `, put together by ${contributorNames}` : "";
  return `${itemCount} pieces, Rs ${total.toLocaleString("en-IN")} in all${credit} on Outfiqe. Tap any piece to shop it.`;
};

export const generateMetadata = async ({ params }: BuildRouteProps): Promise<Metadata> => {
  const { outfitId } = await params;
  const build = await getPublicBuildServer(outfitId);
  if (!build || build.visibility !== "PUBLIC") return PRIVATE_BUILD_METADATA;

  const [coverImageUrl] = build.previewImageUrls;
  return buildPageMetadata({
    title: build.title ?? BUILD_FALLBACK_TITLE,
    description: describeBuild(
      build.itemCount,
      build.total,
      build.contributors.map(({ name }) => name).join(", "),
    ),
    path: `/builds/${outfitId}`,
    image: coverImageUrl
      ? { url: coverImageUrl, alt: build.title ?? BUILD_FALLBACK_TITLE }
      : undefined,
  });
};

const BuildRoute = async ({ params }: BuildRouteProps) => {
  const { outfitId } = await params;
  const session = await getServerSessionWithToken();
  if (session) return <BuildPage outfitId={outfitId} />;

  const build = await getPublicBuildServer(outfitId);
  if (!build) redirect(`/login?redirect=${encodeURIComponent(`/builds/${outfitId}`)}`);
  return <PublicBuildPage initialBuild={build} />;
};

export default BuildRoute;
