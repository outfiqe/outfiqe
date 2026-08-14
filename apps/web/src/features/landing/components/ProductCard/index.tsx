"use client";

import { Button } from "@outfiqe/design-system";
import type { ProductTypeSlug } from "@outfiqe/utils";
import { Heart, Shirt } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useToggleWishlist } from "@/features/wishlist";
import { cn } from "@/shared/lib/cn";

export type ProductType = ProductTypeSlug;

export interface ExploreProduct {
  id: string;
  brand: string;
  name: string;
  price: number;
  wornByCount: number;
  categorySlugs?: string[];
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

const MOCK_BOUGHT_LABELS = ["300+", "800+", "1.2k+", "2.4k+", "5k+", "8k+", "12k+"];

const getSwatchColor = (productId: string) => {
  const charCodeSum = [...productId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return SWATCH_PALETTE[charCodeSum % SWATCH_PALETTE.length];
};

const getMockBoughtLabel = (productId: string) => {
  const weightedSum = [...productId].reduce(
    (sum, char, index) => sum + char.charCodeAt(0) * (index + 1),
    0,
  );
  return MOCK_BOUGHT_LABELS[weightedSum % MOCK_BOUGHT_LABELS.length];
};

type ProductCardProps = {
  product: ExploreProduct;
  onToggleSaved?: (productId: string, saved: boolean) => void;
};

export const ProductCard = ({ product, onToggleSaved }: ProductCardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const wishlistMutation = useToggleWishlist();
  const { id, brand, name, price, wornByCount, lowStock, isNew, image, isSaved } = product;
  const [saved, setSaved] = useState(isSaved ?? false);

  const avatarCount = Math.min(wornByCount, 3);
  const badgeLabel = isNew ? "New" : lowStock ? "Low stock" : null;

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
      { productId: id, saved: wasSaved },
      { onError: () => setSaved(wasSaved) },
    );
    onToggleSaved?.(id, next);
  };

  return (
    <Link href={`/product/${id}`} className="group block">
      <div
        className="relative flex aspect-4/5 items-center justify-center rounded-2xl bg-cover bg-center"
        style={{
          backgroundColor: image ? undefined : getSwatchColor(id),
          backgroundImage: image ? `url(${image})` : undefined,
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

        {!image && <Shirt className="size-16 text-foreground/25" strokeWidth={1} />}
      </div>

      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {brand}
      </p>
      <p className="mt-0.5 text-sm text-foreground">{name}</p>
      <p className="mt-1 text-sm font-bold text-foreground">Rs. {price.toLocaleString()}</p>

      {wornByCount > 0 && (
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
            Worn by {wornByCount} {wornByCount === 1 ? "creator" : "creators"}
            <span aria-hidden> · </span>
            {getMockBoughtLabel(id)} bought
          </span>
        </div>
      )}
    </Link>
  );
};
