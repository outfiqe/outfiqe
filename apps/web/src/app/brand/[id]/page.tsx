import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandProfile, getBrandProfileServerPublic } from "@/features/brand-profile";

interface BrandPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { id } = await params;
  const brand = await getBrandProfileServerPublic(id);
  return { title: brand ? brand.name : "Brand" };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { id } = await params;
  const brand = await getBrandProfileServerPublic(id);
  if (!brand) notFound();

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <BrandProfile brand={brand} />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
