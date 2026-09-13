import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { announcementsApi } from "../api";
import type { AnnouncementStatusValue } from "../schemas";

export const useInfiniteAnnouncements = (status: AnnouncementStatusValue) => {
  return useInfiniteCursorPage(["admin-announcements", status], (cursor) =>
    announcementsApi.list(status, cursor),
  );
};
