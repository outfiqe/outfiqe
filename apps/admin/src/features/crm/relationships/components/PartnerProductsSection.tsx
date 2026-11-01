import { Drawer, DrawerScrollArea } from "@outfiqe/design-system";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { MetricEmptyState, MetricRow, MetricSection } from "@/components/MetricParts";

import { formatRupees } from "../../utils/format.utils";
import type { PartnerDetail } from "../api/relationshipsSchemas";
import { PRODUCT_ROW_CLASS_NAME } from "../constants/productRow";
import { toPublicProductUrl } from "../utils/productUrl.utils";
import { ProductThumbnail } from "./ProductThumbnail";

type PartnerProduct = PartnerDetail["productBreakdown"][number];

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
              href={toPublicProductUrl(productId)}
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
              <span className="line-clamp-2 break-words font-medium text-foreground sm:block sm:truncate">
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
