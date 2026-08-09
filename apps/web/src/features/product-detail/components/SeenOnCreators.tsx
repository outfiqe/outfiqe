"use client";

import Link from "next/link";

import { formatHeight } from "@/shared/lib/formatHeight";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { useRecordSeenOnClick } from "../hooks/useRecordSeenOnClick";
import type { SeenOnCreator } from "../api/productDetailSchemas";

interface SeenOnCreatorsProps {
  productId: string;
  creators: SeenOnCreator[];
}

// Zone 2 of the page: real photos of real people, kept visually separate from the brand's
// official product shots above. Height + size worn are what actually answer "will this fit me".
export function SeenOnCreators({ productId, creators }: SeenOnCreatorsProps) {
  const recordClick = useRecordSeenOnClick();
  if (creators.length === 0) return null;

  return (
    <section id="seen-on-creators" className="border-t border-border py-10">
      <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-foreground">
        Seen on {creators.length} {creators.length === 1 ? "creator" : "creators"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Real fits, real sizes — from people who bought it.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {creators.map((creator) => (
          <Link
            key={creator.creatorId}
            href={`/creator/${creator.handle}`}
            onClick={() => recordClick(creator.lookId, productId)}
            className="group block"
          >
            <div
              className="aspect-4/5 rounded-xl bg-cover bg-center transition-transform group-hover:-translate-y-0.5"
              style={{ backgroundImage: `url(${creator.lookImageUrl})` }}
            />
            <div className="mt-2 flex items-center gap-1.5">
              <span
                aria-hidden
                className="flex size-5 items-center justify-center rounded-full text-[8.5px] font-bold text-white"
                style={{ backgroundColor: getAvatarColor(creator.creatorId) }}
              >
                {initialsFor(creator.name)}
              </span>
              <span className="truncate text-[12.5px] font-medium text-foreground">
                {creator.name}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {creator.heightCm ? formatHeight(creator.heightCm) : "—"}
              {creator.sizeWorn ? ` · wearing ${creator.sizeWorn}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
