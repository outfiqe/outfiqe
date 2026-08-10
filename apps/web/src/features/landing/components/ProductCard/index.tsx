"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Shirt } from "lucide-react";

import { Button } from "@/design-system/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToggleWishlist } from "@/features/wishlist";

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
  isSaved?: boolean;
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

// Mock "bought" count — no purchase-tracking API exists yet, so this is a stable, deterministic
// display value derived from the product id (not a random one, so it doesn't jitter on re-render).
const MOCK_BOUGHT_LABELS = ["300+", "800+", "1.2k+", "2.4k+", "5k+", "8k+", "12k+"];

function getSwatchColor(productId: string) {
  const charCodeSum = [...productId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return SWATCH_PALETTE[charCodeSum % SWATCH_PALETTE.length];
}

function getMockBoughtLabel(productId: string) {
  // Position-weighted so this doesn't move in lockstep with the other id-derived hashes on this
  // card (swatch color, worn-by count) — a flat sum with a constant multiplier equal to the
  // modulus would collapse every product onto the same bucket.
  const weightedSum = [...productId].reduce(
    (sum, char, index) => sum + char.charCodeAt(0) * (index + 1),
    0,
  );
  return MOCK_BOUGHT_LABELS[weightedSum % MOCK_BOUGHT_LABELS.length];
}

interface ProductCardProps {
  product: ExploreProduct;
  onToggleSaved?: (productId: string, saved: boolean) => void;
}

export function ProductCard({ product, onToggleSaved }: ProductCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const wishlistMutation = useToggleWishlist();
  const [saved, setSaved] = useState(product.isSaved ?? false);

  const avatarCount = Math.min(product.wornByCount, 3);
  const badgeLabel = product.isNew ? "New" : product.lowStock ? "Low stock" : null;

  const toggleSaved = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const wasSaved = saved;
    const next = !wasSaved;
    setSaved(next);
    wishlistMutation.mutate(
      { productId: product.id, saved: wasSaved },
      { onError: () => setSaved(wasSaved) },
    );
    onToggleSaved?.(product.id, next);
  };

  return (
    <Link href={`/product/${product.id}`} className="group block">
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
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={saved}
          onClick={toggleSaved}
          className={cn(
            "absolute right-3 top-3 size-8 bg-background/90 text-foreground hover:bg-background",
            saved && "text-primary",
          )}
        >
          <Heart className={cn("size-4", saved && "fill-primary")} />
        </Button>

        {!product.image && <Shirt className="size-16 text-foreground/25" strokeWidth={1} />}
      </div>

      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {product.brand}
      </p>
      <p className="mt-0.5 text-sm text-foreground">{product.name}</p>
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
            <span aria-hidden> · </span>
            {getMockBoughtLabel(product.id)} bought
          </span>
        </div>
      )}
    </Link>
  );
}
