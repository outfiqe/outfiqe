import type { Metadata } from "next";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MessagesPageLayout } from "@/features/messaging";

import { requireDashboardSession } from "../../dashboard/requireDashboardSession";

export const metadata: Metadata = { title: "Messages" };

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

const ConversationRoute = async ({ params }: ConversationPageProps) => {
  const { conversationId } = await params;
  await requireDashboardSession(`/messages/${conversationId}`);

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <MessagesPageLayout conversationId={conversationId} />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default ConversationRoute;
