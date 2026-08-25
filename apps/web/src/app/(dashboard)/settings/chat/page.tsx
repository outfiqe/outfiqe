import type { Metadata } from "next";

import { SiteChatAvailabilitySettings } from "@/features/chat-settings";

import { requireDashboardSession } from "../../requireDashboardSession";

export const metadata: Metadata = { title: "Chat" };

const DashboardChatSettingsPage = async () => {
  await requireDashboardSession("/settings/chat");

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-bold text-foreground">Chat</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Control who can message you on Outfiqe.
      </p>

      <div className="mt-6">
        <SiteChatAvailabilitySettings />
      </div>
    </div>
  );
};

export default DashboardChatSettingsPage;
