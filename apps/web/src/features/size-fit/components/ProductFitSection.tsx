"use client";

import { SizeChartTable, StretchBadge } from "@outfiqe/components";
import { Button } from "@outfiqe/design-system";
import { Ruler } from "lucide-react";
import { useId, useState } from "react";

import { FindMySizeModal, type FitSize } from "./FindMySizeModal";

type ProductFitSectionProps = {
  productName: string;
  sizes: FitSize[];
  isStretchable: boolean | null;
  selectedSizeId: string | null;
  onSelectSize: (sizeId: string) => void;
};

export const ProductFitSection = ({
  productName,
  sizes,
  isStretchable,
  selectedSizeId,
  onSelectSize,
}: ProductFitSectionProps) => {
  const headingId = useId();
  const [isFindMySizeOpen, setIsFindMySizeOpen] = useState(false);

  return (
    <section aria-labelledby={headingId} className="border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={headingId} className="text-sm font-semibold text-foreground">
            Size chart
          </h2>
          <StretchBadge isStretchable={isStretchable} />
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsFindMySizeOpen(true)}>
          <Ruler className="size-4" />
          Find my size
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Set by the brand for this piece. Sizes differ between brands, so check the range, not just
        the label.
      </p>
      <SizeChartTable
        sizes={sizes}
        caption={`Size chart for ${productName}`}
        highlightedSizeId={selectedSizeId}
        className="mt-3"
      />
      <FindMySizeModal
        open={isFindMySizeOpen}
        onClose={() => setIsFindMySizeOpen(false)}
        productName={productName}
        sizes={sizes}
        isStretchable={isStretchable}
        onSelectSize={onSelectSize}
      />
    </section>
  );
};
