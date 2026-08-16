import type { Metadata } from "next";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { OrderDetailBody } from "@/features/orders";

export const metadata: Metadata = { title: "Order" };

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

const OrderDetailPage = async ({ params }: OrderDetailPageProps) => {
  const { orderId } = await params;

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <OrderDetailBody orderId={orderId} />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default OrderDetailPage;
