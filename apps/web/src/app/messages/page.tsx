import type { Metadata } from "next";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MessagesPageLayout } from "@/features/messaging";

import { requireDashboardSession } from "../dashboard/requireDashboardSession";

export const metadata: Metadata = { title: "Messages" };

const MessagesRoute = async () => {
  await requireDashboardSession("/messages");

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <MessagesPageLayout />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default MessagesRoute;
