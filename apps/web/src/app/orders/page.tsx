import type { Metadata } from "next";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { OrdersListBody } from "@/features/orders";
import { cn } from "@/shared/lib/cn";
import { MAIN_KEEPS_FOOTER_BELOW_FOLD_CLASS_NAME } from "@/shared/lib/pageMain";

export const metadata: Metadata = { title: "Your orders" };

export const dynamic = "force-dynamic";

const OrdersPage = () => {
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
          Your orders
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track delivery and payment status for everything you&apos;ve bought.
        </p>
        <Suspense fallback={null}>
          <OrdersListBody />
        </Suspense>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default OrdersPage;
