import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getProductDetailServer, ProductDetail } from "@/features/product-detail";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export const generateMetadata = async ({ params }: ProductPageProps): Promise<Metadata> => {
  const { id } = await params;
  const product = await getProductDetailServer(id);
  return { title: product ? `${product.name} — ${product.brand.name}` : "Product" };
};

const ProductPage = async ({ params }: ProductPageProps) => {
  const { id } = await params;
  const product = await getProductDetailServer(id);
  if (!product) notFound();

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <ProductDetail product={product} />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default ProductPage;
