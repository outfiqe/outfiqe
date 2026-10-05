import { z } from "zod";

import { OutfitEventType } from "#generated/prisma/enums.js";

const announcementSchema = z.object({
  outfitId: z.uuid(),
  version: z.number().int(),
  eventType: z.enum(OutfitEventType),
  actorId: z.uuid().nullable(),
  details: z.record(z.string(), z.unknown()),
  occurredAt: z.iso.datetime(),
});

export type OutfitAnnouncement = z.infer<typeof announcementSchema>;

export const parseOutfitAnnouncement = (payload: unknown): OutfitAnnouncement | null => {
  const parsed = announcementSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
};

export const readDetailString = (
  announcement: OutfitAnnouncement,
  field: string,
): string | null => {
  const value = announcement.details[field];
  return typeof value === "string" ? value : null;
};

export const readDetailStrings = (announcement: OutfitAnnouncement, field: string): string[] => {
  const value = announcement.details[field];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
};
