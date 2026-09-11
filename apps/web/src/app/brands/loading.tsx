import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandGridSkeleton } from "@/features/brands";

const BrandsLoading = () => {
  return (
    <div role="status" aria-label="Loading brands" className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="px-6 pb-16 pt-8 sm:pt-10 lg:px-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary-strong">
            Directory
          </span>
          <h1 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Brands
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Independent labels and makers building the future of Nepali fashion.
          </p>

          <div className="mt-8">
            <BrandGridSkeleton />
          </div>
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default BrandsLoading;
