import type { Metadata } from "next";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CheckoutBody } from "@/features/checkout";
import { cn } from "@/shared/lib/cn";
import { MAIN_KEEPS_FOOTER_BELOW_FOLD_CLASS_NAME } from "@/shared/lib/pageMain";

export const metadata: Metadata = { title: "Checkout" };

export const dynamic = "force-dynamic";

const CheckoutPage = () => {
  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main
        className={cn(
          MAIN_KEEPS_FOOTER_BELOW_FOLD_CLASS_NAME,
          "mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8",
        )}
      >
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground">
          Checkout
        </h1>
        <Suspense fallback={null}>
          <CheckoutBody />
        </Suspense>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default CheckoutPage;
