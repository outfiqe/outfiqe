import { createFileRoute } from "@tanstack/react-router";

import { AnnouncementsPage } from "@/features/announcements/AnnouncementsPage";

export const Route = createFileRoute("/_authenticated/announcements")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: AnnouncementsPage,
});
