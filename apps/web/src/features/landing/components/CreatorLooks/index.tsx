import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { getFeaturedCreatorLooksServer } from "@/features/products/api/getProductsServer";

import { LookCard } from "./LookCard";

export const CreatorLooks = async () => {
  const looks = await getFeaturedCreatorLooksServer();

  return (
    <section className="px-6 py-10 sm:py-14 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase text-foreground sm:text-3xl">
            Creator looks
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Real fits from Nepali creators. Tap any tagged piece to shop it.
          </p>
        </div>

        <Link
          href="/explore"
          className="flex items-center gap-1 text-sm font-semibold text-primary-strong"
        >
          Explore more
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {looks.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No creator looks yet — check back soon.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {looks.slice(0, 10).map((look) => (
            <LookCard key={look.id} look={look} />
          ))}
        </div>
      )}
    </section>
  );
};
