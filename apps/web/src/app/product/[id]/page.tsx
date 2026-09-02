import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getProductDetailServer, ProductDetail } from "@/features/product-detail";
import { Breadcrumbs, buildPageMetadata, JsonLd, productSchema } from "@/shared/seo";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

const priceLabel = (price: number) => `Rs ${price.toLocaleString("en-NP")}`;

const describeProduct = (product: {
  name: string;
  brand: { name: string };
  price: number;
}): string =>
  `${product.name} by ${product.brand.name} — from a Nepali brand, ${priceLabel(product.price)}. ` +
  "See it worn in real creator looks, pick your size, and check out on Outfiqe.";

export const generateMetadata = async ({ params }: ProductPageProps): Promise<Metadata> => {
  const { id } = await params;
  const product = await getProductDetailServer(id);

  if (!product) {
    return buildPageMetadata({
      title: "Product not found",
      description: "This product is no longer available on Outfiqe.",
      path: `/product/${id}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${product.name} — ${product.brand.name}`,
    description: describeProduct(product),
    path: `/product/${product.id}`,
    ogType: "website",
    image: product.imageUrl
      ? { url: product.imageUrl, alt: `${product.name} by ${product.brand.name}` }
      : undefined,
    keywords: [product.name, `${product.brand.name} ${product.name}`, "buy online Nepal"],
  });
};

const ProductPage = async ({ params }: ProductPageProps) => {
  const { id } = await params;
  const product = await getProductDetailServer(id);
  if (!product) notFound();

  const inStock = product.sizes.some((size) => size.inStock);
  const path = `/product/${product.id}`;

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="px-6 pt-4 sm:pt-6 lg:px-10">
          <Breadcrumbs
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Shop", path: "/shop" },
              { name: product.brand.name, path: `/brand/${product.brand.id}` },
              { name: product.name, path },
            ]}
          />
        </div>
        <ProductDetail product={product} />
      </main>
      <SiteFooter />
      <MobileTabBar />
      <JsonLd
        id="product-jsonld"
        data={productSchema({
          name: product.name,
          description: describeProduct(product),
          path,
          image: product.imageUrl,
          priceNpr: product.price,
          brandName: product.brand.name,
          inStock,
          ratingValue: product.avgRating,
          reviewCount: product.reviewCount,
        })}
      />
    </div>
  );
};

export default ProductPage;
