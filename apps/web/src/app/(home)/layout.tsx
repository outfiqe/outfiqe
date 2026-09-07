import type { ReactNode } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandCallout } from "@/features/landing";

interface HomeLayoutProps {
  children: ReactNode;
  hero: ReactNode;
  taste: ReactNode;
  collections: ReactNode;
  trending: ReactNode;
  creatorLooks: ReactNode;
  newArrivals: ReactNode;
}

const HomeLayout = ({
  children,
  hero,
  taste,
  collections,
  trending,
  creatorLooks,
  newArrivals,
}: HomeLayoutProps) => {
  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        {hero}
        {taste}
        {collections}
        {trending}
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
