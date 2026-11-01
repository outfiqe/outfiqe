import { Drawer, DrawerScrollArea } from "@outfiqe/design-system";
import { ChevronRight, Shirt } from "lucide-react";
import { useState } from "react";

import { MetricEmptyState, MetricRow, MetricSection } from "@/components/MetricParts";

import { formatRupees } from "../../utils/format.utils";
import type { PartnerDetail } from "../api/relationshipsSchemas";

type PartnerProduct = PartnerDetail["productBreakdown"][number];

const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";
const PRODUCT_ROW_CLASS_NAME =
  "-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-lg border-b border-border/60 px-2 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ProductThumbnail = ({
  imageUrl,
  productName,
}: Pick<PartnerProduct, "imageUrl" | "productName">) =>
  imageUrl ? (
    <img
      src={imageUrl}
      alt={productName}
      className="size-12 shrink-0 rounded-lg bg-muted object-cover"
    />
  ) : (
    <span
      aria-hidden
      className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted"
    >
      <Shirt className="size-5 text-muted-foreground" />
    </span>
  );

const PartnerProductPanel = ({
  product,
  onClose,
}: {
  product: PartnerProduct;
  onClose: () => void;
}) => {
  const { productId, productName, imageUrl, price, isThrift, isLive } = product;

  return (
    <Drawer
      open
      onClose={onClose}
      title={productName}
      footer={
        isLive && (
          <div className="px-5 py-3">
            <a
              href={`${WEB_URL}/product/${productId}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              See it on Outfiqe
            </a>
          </div>
        )
      }
    >
      <DrawerScrollArea className="space-y-4 p-5">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={productName}
            className="max-h-80 w-full rounded-xl bg-muted object-contain"
          />
        )}
        <div>
          <MetricRow label="Price" value={formatRupees(price)} />
          <MetricRow label="Type" value={isThrift ? "Thrift" : "New"} />
          <MetricRow label="On sale now" value={isLive ? "Yes" : "No"} />
          <MetricRow label="Tag clicks" value={product.tagClickCount.toLocaleString()} />
          <MetricRow
            label="Orders they brought"
            value={product.attributedOrderCount.toLocaleString()}
          />
          <MetricRow label="Sales they brought" value={formatRupees(product.attributedRevenue)} />
        </div>
      </DrawerScrollArea>
    </Drawer>
  );
};

export const PartnerProductsSection = ({ products }: { products: PartnerProduct[] }) => {
  const [selectedProduct, setSelectedProduct] = useState<PartnerProduct | null>(null);

  return (
    <MetricSection
      title="Per product"
      description="Which of your products this partner helps sell. Click one for details."
    >
      {products.length === 0 ? (
        <MetricEmptyState>No product activity yet.</MetricEmptyState>
      ) : (
        products.map((product) => (
          <button
            key={product.productId}
            type="button"
            onClick={() => setSelectedProduct(product)}
            className={PRODUCT_ROW_CLASS_NAME}
          >
            <ProductThumbnail imageUrl={product.imageUrl} productName={product.productName} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-foreground">
                {product.productName}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {product.tagClickCount.toLocaleString()} tag clicks ·{" "}
                {product.attributedOrderCount.toLocaleString()} orders
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 font-semibold text-foreground">
              {formatRupees(product.attributedRevenue)}
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </span>
          </button>
        ))
      )}

      {selectedProduct && (
        <PartnerProductPanel product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </MetricSection>
  );
};
