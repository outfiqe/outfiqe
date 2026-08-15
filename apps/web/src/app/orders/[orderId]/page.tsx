import type { Metadata } from "next";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

import { OrderConfirmationBody } from "./OrderConfirmationBody";

export const metadata: Metadata = { title: "Order placed" };

interface OrderConfirmationPageProps {
  params: Promise<{ orderId: string }>;
}

const OrderConfirmationPage = async ({ params }: OrderConfirmationPageProps) => {
  const { orderId } = await params;

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <OrderConfirmationBody orderId={orderId} />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default OrderConfirmationPage;
