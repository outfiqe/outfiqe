import type { ReactNode } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandCallout } from "@/features/landing";
import { MAIN_KEEPS_FOOTER_BELOW_FOLD_CLASS_NAME } from "@/shared/lib/pageMain";

interface HomeLayoutProps {
  children: ReactNode;
  hero: ReactNode;
  taste: ReactNode;
  collections: ReactNode;
  trending: ReactNode;
  sale: ReactNode;
  creatorLooks: ReactNode;
  newArrivals: ReactNode;
}

const HomeLayout = ({
  children,
  hero,
  taste,
  collections,
  trending,
  sale,
  creatorLooks,
  newArrivals,
}: HomeLayoutProps) => {
  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main className={MAIN_KEEPS_FOOTER_BELOW_FOLD_CLASS_NAME}>
        {hero}
        {taste}
        {trending}
        {sale}
        {collections}
        {creatorLooks}
        {newArrivals}
        <BrandCallout />
      </main>
      <SiteFooter />
      <MobileTabBar />
      {children}
    </div>
  );
};

export default HomeLayout;
