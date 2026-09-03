import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  CreatorProfile,
  CreatorProfilePageSkeleton,
  getCreatorProfileServerPublic,
} from "@/features/creator-profile";
import { Breadcrumbs, buildPageMetadata, JsonLd, profilePageSchema } from "@/shared/seo";

interface CreatorPageProps {
  params: Promise<{ handle: string }>;
}

const describeCreator = (creator: {
  name: string;
  handle: string;
  postsCount: number;
  taggedPiecesCount: number;
}): string =>
  `${creator.postsCount} looks from ${creator.name} (@${creator.handle}), tagging ${creator.taggedPiecesCount} products from Nepali brands. Shop the exact pieces from every look.`;

export const generateMetadata = async ({ params }: CreatorPageProps): Promise<Metadata> => {
  const { handle } = await params;
  const creator = await getCreatorProfileServerPublic(handle);

  if (!creator) {
    return buildPageMetadata({
      title: "Creator not found",
      description: "This creator profile is not available on Outfiqe.",
      path: `/creator/${handle}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${creator.name}'s looks (@${creator.handle})`,
    description: describeCreator(creator),
    path: `/creator/${creator.handle}`,
    ogType: "profile",
    image: creator.avatarUrl ? { url: creator.avatarUrl, alt: creator.name } : undefined,
    keywords: [creator.name, `@${creator.handle}`, "Nepali fashion creator", "creator looks"],
  });
};

const CreatorPage = async ({ params }: CreatorPageProps) => {
  const { handle } = await params;
  const creator = await getCreatorProfileServerPublic(handle);
  if (!creator) notFound();

  const path = `/creator/${creator.handle}`;

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
          <Breadcrumbs
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Creators", path: "/leaderboard/creators" },
              { name: creator.name, path },
            ]}
          />
        </div>
        <Suspense fallback={<CreatorProfilePageSkeleton />}>
          <CreatorProfile creator={creator} />
        </Suspense>
      </main>
      <SiteFooter />
      <MobileTabBar />
      <JsonLd
        id="creator-jsonld"
        data={profilePageSchema({
          name: creator.name,
          handle: creator.handle,
          path,
          image: creator.avatarUrl,
        })}
      />
    </div>
  );
};

export default CreatorPage;
