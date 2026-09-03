import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCategoriesServer } from "@/features/categories";
import { ShopResults } from "@/features/shop";
import { getQueryClient } from "@/shared/lib/getQueryClient";
import { buildPageMetadata, collectionPageSchema, JsonLd } from "@/shared/seo";

interface ShopPageProps {
  searchParams: Promise<{ category?: string; type?: string; sort?: string }>;
}

const SORT_LABEL: Record<string, string> = {
  trending: "Trending",
  "new-arrivals": "New arrivals",
  newest: "New in",
};

const resolveCategoryName = async (slug?: string): Promise<string | null> => {
  if (!slug) return null;
  const categories = await getCategoriesServer().catch(() => []);
  return categories.find((category) => category.slug === slug)?.name ?? null;
};

const buildCanonicalPath = (params: {
  category?: string;
  type?: string;
  sort?: string;
}): string => {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.type) query.set("type", params.type);
  if (params.sort && params.sort !== "newest") query.set("sort", params.sort);
  const suffix = query.toString();
  return suffix ? `/shop?${suffix}` : "/shop";
};

export const generateMetadata = async ({ searchParams }: ShopPageProps): Promise<Metadata> => {
  const params = await searchParams;
  const categoryName = await resolveCategoryName(params.category);
  const sortLabel = params.sort ? SORT_LABEL[params.sort] : null;

  const subject = categoryName
    ? `${categoryName} clothing`
    : sortLabel
      ? `${sortLabel} fashion`
      : "Fashion from Nepali brands";

  const title = categoryName
    ? `Shop ${categoryName.toLowerCase()} from Nepali brands`
    : sortLabel
      ? `${sortLabel} on Outfiqe`
      : "Shop all clothing from Nepali brands";

  const description = categoryName
    ? `Shop ${categoryName.toLowerCase()} pieces from Nepali brands on Outfiqe, styled in creator looks so you see the fit first. One cart, delivered across Nepal.`
    : `Browse ${subject.toLowerCase()} across every Nepali brand on Outfiqe. Each piece is shown worn by a creator before you buy.`;

  return buildPageMetadata({
    title,
    description,
    path: buildCanonicalPath(params),
    keywords: categoryName
      ? [`${categoryName} clothing Nepal`, `buy ${categoryName.toLowerCase()} online Nepal`]
      : ["shop clothes online Nepal", "Nepali fashion", "online clothing store Nepal"],
  });
};

const ShopPage = async ({ searchParams }: ShopPageProps) => {
  const params = await searchParams;
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({ queryKey: ["categories"], queryFn: getCategoriesServer });

  const categoryName = await resolveCategoryName(params.category);
  const canonicalPath = buildCanonicalPath(params);

  const heading = categoryName
    ? `${categoryName} from Nepali brands`
    : "Shop clothing from Nepali brands";
  const intro = categoryName
    ? `Every ${categoryName.toLowerCase()} piece below is from a Nepali brand, shown in a creator look so you can judge the fit before you buy.`
    : "One storefront for Nepal's clothing brands, each piece styled in a real creator look. Filter by style or type, add across brands to one cart, and check out once.";

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="pb-20 lg:pb-0">
        <SiteHeader />
        <main>
          <div className="px-6 pb-16 pt-8 sm:pt-10 lg:px-10">
            <header className="max-w-2xl">
              <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-4xl">
                {heading}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{intro}</p>
            </header>
            <Suspense fallback={<ProductGridSkeleton className="mt-8" />}>
              <ShopResults />
            </Suspense>
          </div>
        </main>
        <SiteFooter />
        <MobileTabBar />
      </div>
      <JsonLd
        id="shop-jsonld"
        data={collectionPageSchema({ name: heading, description: intro, path: canonicalPath })}
      />
    </HydrationBoundary>
  );
};

export default ShopPage;
