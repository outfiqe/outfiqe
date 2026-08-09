import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileTabBar } from "@/components/MobileTabBar";
import { getCreatorProfileServerPublic, CreatorProfile } from "@/features/creator-profile";

interface CreatorPageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: CreatorPageProps): Promise<Metadata> {
  const { handle } = await params;
  const creator = await getCreatorProfileServerPublic(handle);
  return { title: creator ? creator.name : "Creator" };
}

export default async function CreatorPage({ params }: CreatorPageProps) {
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
}
