import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CreatorProfilePageSkeleton } from "@/features/creator-profile";
import { MAIN_KEEPS_FOOTER_BELOW_FOLD_CLASS_NAME } from "@/shared/lib/pageMain";

const CreatorLoading = () => {
  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main className={MAIN_KEEPS_FOOTER_BELOW_FOLD_CLASS_NAME}>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <CreatorProfilePageSkeleton />
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default CreatorLoading;
