import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CreatorProfile, getCreatorProfileServerPublic } from "@/features/creator-profile";

interface CreatorPageProps {
  params: Promise<{ handle: string }>;
}

export const generateMetadata = async ({ params }: CreatorPageProps): Promise<Metadata> => {
  const { handle } = await params;
  const creator = await getCreatorProfileServerPublic(handle);
  return { title: creator ? creator.name : "Creator" };
};

const CreatorPage = async ({ params }: CreatorPageProps) => {
  const { handle } = await params;
  const creator = await getCreatorProfileServerPublic(handle);
  if (!creator) notFound();

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <CreatorProfile creator={creator} />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default CreatorPage;
