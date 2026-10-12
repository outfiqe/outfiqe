import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { announcementsApi } from "../api/announcementsApi";
import type { AnnouncementStatusValue } from "../api/announcementsSchemas";

export const useInfiniteAnnouncements = (status: AnnouncementStatusValue) => {
  return useInfiniteCursorPage(["admin-announcements", status], (cursor) =>
    announcementsApi.list(status, cursor),
  );
};
