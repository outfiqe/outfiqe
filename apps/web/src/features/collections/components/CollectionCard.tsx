import Link from "next/link";

import { AppImage } from "@/shared/components/AppImage";
import { getAvatarColor } from "@/shared/lib/avatarColor";

import type { PublicCollection } from "../api/collectionSchemas";

const COLLECTION_CARD_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

type CollectionCardProps = {
  collection: PublicCollection;
};

export const CollectionCard = ({ collection }: CollectionCardProps) => {
  return (
    <Link href={`/collections/${collection.slug}`} className="group block">
      <div
        className="relative flex aspect-4/3 items-end overflow-hidden rounded-2xl p-4 transition-transform group-hover:-translate-y-0.5"
        style={collection.imageUrl ? undefined : { backgroundColor: getAvatarColor(collection.id) }}
      >
        {collection.imageUrl && (
          <AppImage src={collection.imageUrl} alt="" fill sizes={COLLECTION_CARD_SIZES} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <div className="relative z-10">
          <p className="font-display text-lg font-extrabold uppercase leading-tight tracking-tight text-white">
            {collection.name}
          </p>
          <p className="mt-1 text-xs text-white/80">
            {collection.productCount} {collection.productCount === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </div>
    </Link>
  );
};
