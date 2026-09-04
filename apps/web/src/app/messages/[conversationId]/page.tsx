import type { Metadata } from "next";

import { DashboardMobileNavBar } from "@/components/DashboardMobileNavBar";
import { SiteHeader } from "@/components/SiteHeader";
import { MessagesPageLayout } from "@/features/messaging";

import { requireDashboardSession } from "../../(dashboard)/requireDashboardSession";

export const metadata: Metadata = { title: "Messages" };

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

const ConversationRoute = async ({ params }: ConversationPageProps) => {
  const { conversationId } = await params;
  await requireDashboardSession(`/messages/${conversationId}`);

  return (
    <div>
      <SiteHeader />
      <main>
        <MessagesPageLayout conversationId={conversationId} />
      </main>
      <DashboardMobileNavBar />
    </div>
  );
};

export default ConversationRoute;
