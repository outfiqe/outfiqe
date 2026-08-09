import Link from "next/link";

import { Button } from "@/design-system/components/ui/button";

export function BrandCallout() {
  return (
    <section className="px-6 py-16 sm:py-24 lg:px-10">
      <div className="rounded-3xl bg-linear-to-br from-[#241006] via-[#7a3010] to-primary px-6 py-10 sm:px-10 sm:py-14">
        <span className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70">
          For brands
        </span>
        <h2 className="mt-3 max-w-xl font-display text-2xl font-bold leading-tight text-primary-foreground sm:text-4xl">
          Free to list. We build your storefront for you.
        </h2>
        <div className="mt-6">
          <Button
            size="lg"
            asChild
            className="bg-background text-foreground hover:bg-background/90"
          >
            <Link href="/apply">Apply now</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
