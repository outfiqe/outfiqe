import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/shared/lib/cn";

import { type ExploreProduct, ProductCard } from "../ProductCard";

type ProductRailProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  products: ExploreProduct[];
  emptyMessage?: string;
};

export const ProductRail = ({
  eyebrow,
  title,
  description,
  viewAllHref,
  viewAllLabel = "View all",
  products,
  emptyMessage = "Nothing to show here yet.",
}: ProductRailProps) => {
  return (
    <section className="px-6 py-10 sm:py-14 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <span className="text-xs font-bold uppercase tracking-widest text-primary-strong">
              {eyebrow}
            </span>
          )}
          <h2
            className={cn(
              "font-display text-2xl font-bold uppercase text-foreground sm:text-3xl",
              eyebrow && "mt-2",
            )}
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-sm font-semibold text-primary-strong"
          >
            {viewAllLabel}
            <ArrowRight className="size-4" />
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {products.slice(0, 10).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};
