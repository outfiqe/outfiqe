import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandProfile, getBrandProfileServerPublic } from "@/features/brand-profile";
import { brandStoreSchema, Breadcrumbs, buildPageMetadata, JsonLd } from "@/shared/seo";

interface BrandPageProps {
  params: Promise<{ id: string }>;
}

const describeBrand = (brand: { name: string; productCount: number }): string =>
  `${brand.productCount} pieces from ${brand.name}, a Nepali brand, each shown in real creator looks. Follow the brand and shop the full range with one checkout.`;

export const generateMetadata = async ({ params }: BrandPageProps): Promise<Metadata> => {
  const { id } = await params;
  const brand = await getBrandProfileServerPublic(id);

  if (!brand) {
    return buildPageMetadata({
      title: "Brand not found",
      description: "This brand is not available on Outfiqe.",
      path: `/brand/${id}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${brand.name} clothing`,
    description: describeBrand(brand),
    path: `/brand/${brand.id}`,
    image: brand.bannerUrl
      ? { url: brand.bannerUrl, alt: brand.name }
      : brand.avatarUrl
        ? { url: brand.avatarUrl, alt: brand.name }
        : undefined,
    keywords: [brand.name, `${brand.name} Nepal`, `buy ${brand.name} online`],
  });
};

const BrandPage = async ({ params }: BrandPageProps) => {
  const { id } = await params;
  const brand = await getBrandProfileServerPublic(id);
  if (!brand) notFound();

  const path = `/brand/${brand.id}`;

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
          <Breadcrumbs
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Brands", path: "/brands" },
              { name: brand.name, path },
            ]}
          />
        </div>
        <BrandProfile brand={brand} />
      </main>
      <SiteFooter />
      <MobileTabBar />
      <JsonLd
        id="brand-jsonld"
        data={brandStoreSchema({
          name: brand.name,
          description: describeBrand(brand),
          path,
          image: brand.avatarUrl ?? brand.bannerUrl,
        })}
      />
    </div>
  );
};

export default BrandPage;
