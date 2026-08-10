"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Heart, Shirt, Zap } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { Button } from "@/design-system/components/ui/button";
import { toast } from "@/design-system/components/ui/toast";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToggleWishlist } from "@/features/wishlist";
import { TrustLine } from "./TrustLine";
import { SizeSelector } from "./SizeSelector";
import { QuantitySelector } from "./QuantitySelector";
import { ShippingInfo } from "./ShippingInfo";
import { SeenOnCreators } from "./SeenOnCreators";
import type { ProductDetail as ProductDetailType } from "../api/productDetailSchemas";

type ProductDetailProps = {
  product: ProductDetailType;
};

export const ProductDetail = ({ product }: ProductDetailProps) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const wishlistMutation = useToggleWishlist();

  const [isSaved, setIsSaved] = useState(product.isSaved);
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.sizes.find((size) => size.inStock)?.label ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const needsSize = product.sizes.length > 0 && !selectedSize;

  const goToSignIn = () => router.push(`/login?redirect=/product/${product.id}`);
  const gated = (action: () => void) => (isAuthenticated ? action() : goToSignIn());

  const toggleSaved = () => {
    const next = !isSaved;
    setIsSaved(next);
    wishlistMutation.mutate(
      { productId: product.id, saved: isSaved },
      { onError: () => setIsSaved(!next) },
    );
  };

  const addToCart = () => {
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  const buyNow = () => {
    const sizeLabel = selectedSize ? ` (Size ${selectedSize})` : "";
    toast.success(`Redirecting to checkout for ${quantity} × ${product.name}${sizeLabel}…`);
  };

  const scrollToSeenOn = () => {
    document.getElementById("seen-on-creators")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 py-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back
      </button>

      <div className="grid gap-8 pb-10 lg:grid-cols-2 lg:gap-14">
        {/* Zone 1: official product photography — the brand's, never mixed with creator photos. */}
        <div
          className="flex aspect-4/5 items-center justify-center rounded-2xl bg-muted bg-cover bg-center"
          style={{ backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : undefined }}
        >
          {!product.imageUrl && <Shirt className="size-20 text-foreground/25" strokeWidth={1} />}
        </div>

        <div>
          <Link
            href={`/brand/${product.brand.id}`}
            className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary-strong"
          >
            {product.brand.name} →
          </Link>
          <h1 className="mt-2 font-display text-3xl font-extrabold uppercase leading-tight tracking-tight text-foreground">
            {product.name}
          </h1>
          <p className="mt-3 font-display text-xl font-semibold text-foreground">
            Rs. {product.price.toLocaleString()}
          </p>

          <TrustLine
            wornByCount={product.wornByCount}
            creators={product.seenOnCreators}
            onClick={scrollToSeenOn}
          />

          <SizeSelector sizes={product.sizes} selected={selectedSize} onSelect={setSelectedSize} />

          <QuantitySelector quantity={quantity} onChange={setQuantity} />

          <div className="mt-5 flex gap-2.5">
            <Button
              variant="outline"
              className="flex-1"
              disabled={needsSize}
              onClick={() => gated(addToCart)}
            >
              {added ? "Added ✓" : "Add to cart"}
            </Button>
            <Button className="flex-1" disabled={needsSize} onClick={() => gated(buyNow)}>
              <Zap className="size-4" />
              Buy now
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-pressed={isSaved}
              aria-label="Save"
              onClick={() => gated(toggleSaved)}
              className={cn("size-11 shrink-0", isSaved && "border-primary text-primary")}
            >
              <Heart className={cn("size-[18px]", isSaved && "fill-primary")} />
            </Button>
          </div>
          {needsSize && <p className="mt-2 text-xs text-destructive">Select a size to continue.</p>}

          <ShippingInfo />
        </div>
      </div>

      <SeenOnCreators productId={product.id} creators={product.seenOnCreators} />
    </div>
  );
};
