import type { Metadata } from "next";

import { RiderVisitPage } from "@/features/rider";

export const metadata: Metadata = { title: "Visit" };

interface RiderVisitRouteProps {
  params: Promise<{ taskId: string }>;
}

const RiderVisitRoute = async ({ params }: RiderVisitRouteProps) => {
  const { taskId } = await params;
  return <RiderVisitPage taskId={taskId} />;
};

export default RiderVisitRoute;
