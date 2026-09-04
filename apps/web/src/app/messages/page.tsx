import type { Metadata } from "next";

import { DashboardMobileNavBar } from "@/components/DashboardMobileNavBar";
import { SiteHeader } from "@/components/SiteHeader";
import { MessagesPageLayout } from "@/features/messaging";

import { requireDashboardSession } from "../(dashboard)/requireDashboardSession";

export const metadata: Metadata = { title: "Messages" };

const MessagesRoute = async () => {
  await requireDashboardSession("/messages");

  return (
    <div>
      <SiteHeader />
      <main>
        <MessagesPageLayout />
      </main>
      <DashboardMobileNavBar />
    </div>
  );
};

export default MessagesRoute;
