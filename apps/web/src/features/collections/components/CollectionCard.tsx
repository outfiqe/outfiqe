import Link from "next/link";

import { getAvatarColor } from "@/shared/lib/avatarColor";

import type { PublicCollection } from "../api/collectionSchemas";

type CollectionCardProps = {
  collection: PublicCollection;
};

export const CollectionCard = ({ collection }: CollectionCardProps) => {
  return (
    <Link href={`/collections/${collection.slug}`} className="group block">
      <div
        className="relative flex aspect-4/3 items-end overflow-hidden rounded-2xl bg-cover bg-center p-4 transition-transform group-hover:-translate-y-0.5"
        style={{
          backgroundColor: collection.imageUrl ? undefined : getAvatarColor(collection.id),
          backgroundImage: collection.imageUrl ? `url(${collection.imageUrl})` : undefined,
        }}
      >
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
