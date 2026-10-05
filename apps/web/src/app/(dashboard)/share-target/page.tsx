import type { Metadata } from "next";

import { requireDashboardSession } from "../requireDashboardSession";
import { ShareTargetComposer } from "./ShareTargetComposer";

export const metadata: Metadata = { title: "New drop" };

const ShareTargetPage = async () => {
  const { user } = await requireDashboardSession("/share-target");

  return <ShareTargetComposer creatorStatus={user.creatorStatus} />;
};

export default ShareTargetPage;
