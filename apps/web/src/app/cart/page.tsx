import type { Metadata } from "next";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CartBody } from "@/features/cart";

export const metadata: Metadata = { title: "Your bag" };

const CartPage = () => {
  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground">
          Your bag
        </h1>
        <Suspense fallback={null}>
          <CartBody />
        </Suspense>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default CartPage;
