"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { FeedPost } from "@/features/explore/api/exploreFeedSchemas";
import { PostCaption } from "@/features/explore/components/PostCaption";
import { AppImage } from "@/shared/components/AppImage";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import type { ResponsiveImage } from "@/shared/lib/responsiveImage";

const LOOK_CARD_SIZES = "(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw";

type LookCardProps = {
  look: FeedPost;
};

const LookImageFrame = ({
  productId,
  imageUrl,
  image,
  alt,
  children,
}: {
  productId: string | undefined;
  imageUrl: string;
  image: ResponsiveImage | null | undefined;
  alt: string;
  children: ReactNode;
}) => {
  const className = "relative block aspect-4/5 overflow-hidden rounded-2xl bg-muted";
  const content = (
    <>
      <AppImage src={imageUrl} image={image} alt={alt} fill sizes={LOOK_CARD_SIZES} />
      {children}
    </>
  );

  if (!productId) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={`/product/${productId}`} prefetch={false} className={className}>
      {content}
    </Link>
  );
};

export const LookCard = ({ look }: LookCardProps) => {
  const { creator, imageUrl, image, caption, likeCount, taggedProducts } = look;
  const [primaryProduct, ...restProducts] = taggedProducts;

  return (
    <div>
      <LookImageFrame
        productId={primaryProduct?.id}
        imageUrl={imageUrl}
        image={image}
        alt={`Look by ${creator.name}`}
      >
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs font-semibold text-white">
          <Heart className="size-3.5 fill-white" />
          {likeCount.toLocaleString()}
        </span>
      </LookImageFrame>

      <div className="mt-3 flex items-center gap-2">
        <span
          aria-hidden
          className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: getAvatarColor(creator.id) }}
        >
          {initialsFor(creator.name)}
        </span>
        <Link
          href={`/creator/${creator.handle}`}
          prefetch={false}
          className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground hover:underline"
        >
          {creator.name}
        </Link>
      </div>

      {caption && <PostCaption text={caption} className="mt-1 text-sm text-foreground" />}

      {primaryProduct && (
        <Link
          href={`/product/${primaryProduct.id}`}
          prefetch={false}
          className="mt-1 block text-sm font-bold text-foreground hover:underline"
        >
          {primaryProduct.name} · Rs. {primaryProduct.price.toLocaleString()}
        </Link>
      )}

      {restProducts.length > 0 && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          +{restProducts.length} more piece{restProducts.length === 1 ? "" : "s"} tagged
        </p>
      )}
    </div>
  );
};
