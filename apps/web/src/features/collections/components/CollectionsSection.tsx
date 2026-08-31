import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { getHomepageCollectionsServer } from "../api/getCollectionsServer";
import { CollectionCard } from "./CollectionCard";

export const CollectionsSection = async () => {
  const collections = await getHomepageCollectionsServer();

  return (
    <section className="px-6 py-10 sm:py-14 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary-strong">
            Curated
          </span>
          <h2 className="mt-2 font-display text-2xl font-bold uppercase text-foreground sm:text-3xl">
            Collections
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Edits built around a season, an occasion, or a way of dressing.
          </p>
        </div>

        <Link
          href="/collections"
          className="flex items-center gap-1 text-sm font-semibold text-primary-strong"
        >
          View all
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {collections.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No collections yet — check back soon.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </section>
  );
};
