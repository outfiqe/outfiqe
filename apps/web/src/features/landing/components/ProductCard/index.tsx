import Link from "next/link";
import { Heart, Shirt } from "lucide-react";

import { Button } from "@/design-system/components/ui/button";

export type ProductType = "tops" | "bottoms" | "pants" | "headwear" | "outerwear" | "dresses";

export interface ExploreProduct {
  id: string;
  brand: string;
  name: string;
  price: number;
  wornByCount: number;
  categorySlug?: string;
  type?: ProductType;
  lowStock?: boolean;
  isNew?: boolean;
  image?: string;
}

const SWATCH_PALETTE = [
  "#e3d5c5",
  "#c9d3d8",
  "#d9c7a8",
  "#d4cbe0",
  "#cdd3c0",
  "#e0d0c8",
  "#c8d0d6",
  "#dccab5",
];

const AVATAR_COLORS = ["#c9a27a", "#7d8fa3", "#a3785a"];

function getSwatchColor(productId: string) {
  const charCodeSum = [...productId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return SWATCH_PALETTE[charCodeSum % SWATCH_PALETTE.length];
}

interface ProductCardProps {
  product: ExploreProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const avatarCount = Math.min(product.wornByCount, 3);
  const badgeLabel = product.isNew ? "New" : product.lowStock ? "Low stock" : null;

  return (
    <Link href="#" className="group block">
      <div
        className="relative flex aspect-4/5 items-center justify-center rounded-2xl bg-cover bg-center"
        style={{
          backgroundColor: product.image ? undefined : getSwatchColor(product.id),
          backgroundImage: product.image ? `url(${product.image})` : undefined,
        }}
      >
        {badgeLabel && (
          <span className="absolute left-3 top-3 rounded bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            {badgeLabel}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          aria-label="Save to wishlist"
          className="absolute right-3 top-3 size-8 bg-background/90 text-foreground hover:bg-background"
        >
          <Heart className="size-4" />
        </Button>

        {!product.image && <Shirt className="size-16 text-foreground/25" strokeWidth={1} />}
      </div>

      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {product.brand}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{product.name}</p>
      <p className="mt-1 text-sm font-bold text-foreground">Rs. {product.price.toLocaleString()}</p>

      {product.wornByCount > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {Array.from({ length: avatarCount }).map((_, i) => (
              <span
                key={i}
                className="size-4 rounded-full border border-background"
                style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            Worn by {product.wornByCount} {product.wornByCount === 1 ? "creator" : "creators"}
          </span>
        </div>
      )}
    </Link>
  );
}
