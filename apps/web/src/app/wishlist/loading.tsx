import { MobileTabBar } from "@/components/MobileTabBar";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const WishlistLoading = () => {
  return (
    <div role="status" aria-label="Loading" className="pb-20 lg:pb-0">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground">
          Saved
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Pieces you&apos;ve kept for later.</p>
        <ProductGridSkeleton className="mt-8 gap-x-4 gap-y-8 pb-16" />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default WishlistLoading;
