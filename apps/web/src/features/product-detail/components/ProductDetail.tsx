"use client";

import { Button, toast } from "@outfiqe/design-system";
import { ChevronLeft, Heart, Shirt, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useAddToCart } from "@/features/cart";
import { saveBuyNowPayload } from "@/features/checkout";
import { ReviewsSection } from "@/features/product-reviews";
import { useToggleWishlist } from "@/features/wishlist";
import { cn } from "@/shared/lib/cn";

import type { ProductDetail as ProductDetailType } from "../api/productDetailSchemas";
import { QuantitySelector } from "./QuantitySelector";
import { SeenOnCreators } from "./SeenOnCreators";
import { ShippingInfo } from "./ShippingInfo";
import { SizeSelector } from "./SizeSelector";
import { TrustLine } from "./TrustLine";

type ProductDetailProps = {
  product: ProductDetailType;
};

export const ProductDetail = ({ product }: ProductDetailProps) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const wishlistMutation = useToggleWishlist();
  const addToCartMutation = useAddToCart();

  const [isSaved, setIsSaved] = useState(product.isSaved);

  const availableSizes = product.sizes.filter((size) => size.inStock);
  const isSoldOut = availableSizes.length === 0;

  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(
    availableSizes[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);

  const galleryImages =
    product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const activeImage = galleryImages[selectedImageIndex] ?? galleryImages[0];

  const needsSizeChoice = !isSoldOut && !selectedSizeId;
  const canPurchase = !isSoldOut && Boolean(selectedSizeId);

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
    if (!selectedSizeId) return;
    addToCartMutation.mutate(
      { productId: product.id, sizeId: selectedSizeId, qty: quantity },
      { onSuccess: () => toast.success("Added to your bag.") },
    );
  };

  const buyNow = () => {
    const selectedSize = product.sizes.find((size) => size.id === selectedSizeId);
    if (!selectedSize) return;

    saveBuyNowPayload({
      productId: product.id,
      sizeId: selectedSize.id,
      qty: quantity,
      productName: product.name,
      brandName: product.brand.name,
      imageUrl: activeImage ?? product.imageUrl,
      sizeLabel: selectedSize.label,
      unitPrice: product.price,
    });
    router.push("/checkout?buyNow=1");
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
        <div>
          <div
            className="flex aspect-4/5 items-center justify-center rounded-2xl bg-muted bg-cover bg-center"
            style={{ backgroundImage: activeImage ? `url(${activeImage})` : undefined }}
          >
            {!activeImage && <Shirt className="size-20 text-foreground/25" strokeWidth={1} />}
          </div>

          {galleryImages.length > 1 && (
            <div className="mt-3 flex gap-2.5">
              {galleryImages.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  aria-label={`Show photo ${index + 1}`}
                  aria-current={index === selectedImageIndex}
                  className={cn(
                    "aspect-square w-16 shrink-0 overflow-hidden rounded-lg border bg-muted bg-cover bg-center transition-colors",
                    index === selectedImageIndex ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundImage: `url(${image})` }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <Link
            href={`/brand/${product.brand.id}`}
            className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary-strong"
          >
            {product.brand.name} →
          </Link>
          <h1 className="mt-2 font-display text-2xl font-extrabold uppercase leading-tight tracking-tight text-foreground sm:text-3xl">
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

          <SizeSelector
            sizes={product.sizes}
            selected={selectedSizeId}
            onSelect={setSelectedSizeId}
          />

          <QuantitySelector quantity={quantity} onChange={setQuantity} />

          <div className="mt-5 flex gap-2.5">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!canPurchase || addToCartMutation.isPending}
              onClick={() => gated(addToCart)}
            >
              {addToCartMutation.isPending ? "Adding…" : "Add to cart"}
            </Button>
            <Button className="flex-1" disabled={!canPurchase} onClick={() => gated(buyNow)}>
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
          {isSoldOut ? (
            <p className="mt-2 text-sm font-semibold text-foreground">Out of stock</p>
          ) : needsSizeChoice ? (
            <p className="mt-2 text-xs text-destructive">Select a size to continue.</p>
          ) : null}

          <ShippingInfo />
        </div>
      </div>

      <SeenOnCreators productId={product.id} creators={product.seenOnCreators} />

      <ReviewsSection productId={product.id} initialRatingSummary={product} />
    </div>
  );
};
