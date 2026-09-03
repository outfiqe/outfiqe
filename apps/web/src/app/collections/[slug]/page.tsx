import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CollectionDetail, getCollectionDetailServer } from "@/features/collections";
import {
  Breadcrumbs,
  buildPageMetadata,
  collectionPageSchema as collectionPageJsonLd,
  JsonLd,
} from "@/shared/seo";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

const describeCollection = (collection: {
  name: string;
  description: string | null;
  productCount: number;
}): string =>
  collection.description ??
  `${collection.productCount} pieces from Nepali brands in the ${collection.name} collection, styled in real creator looks.`;

export const generateMetadata = async ({ params }: CollectionPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const collection = await getCollectionDetailServer(slug);

  if (!collection) {
    return buildPageMetadata({
      title: "Collection not found",
      description: "This collection is no longer available on Outfiqe.",
      path: `/collections/${slug}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${collection.name} collection`,
    description: describeCollection(collection),
    path: `/collections/${collection.slug}`,
    image: collection.imageUrl ? { url: collection.imageUrl, alt: collection.name } : undefined,
    keywords: [collection.name, `${collection.name} Nepal`, "fashion collection Nepal"],
  });
};

const CollectionPage = async ({ params }: CollectionPageProps) => {
  const { slug } = await params;
  const collection = await getCollectionDetailServer(slug);
  if (!collection) notFound();

  const path = `/collections/${collection.slug}`;

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="px-6 pt-4 sm:pt-6 lg:px-10">
          <Breadcrumbs
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Collections", path: "/collections" },
              { name: collection.name, path },
            ]}
          />
        </div>
        <CollectionDetail collection={collection} />
      </main>
      <SiteFooter />
      <MobileTabBar />
      <JsonLd
        id="collection-jsonld"
        data={collectionPageJsonLd({
          name: collection.name,
          description: describeCollection(collection),
          path,
        })}
      />
    </div>
  );
};

export default CollectionPage;
