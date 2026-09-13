import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import { getPlatformPrincipal } from "#modules/platform-access/platform-access.middleware.js";

import type {
  AnnouncementIdParam,
  CreateAnnouncementBody,
  ListAnnouncementsQuery,
  SendAnnouncementBody,
  UpdateAnnouncementBody,
} from "./announcement.schemas.js";
import { announcementService } from "./announcement.service.js";

const CREATED_STATUS = 201;

export const announcementController = {
  async create(_req: Request, res: Response) {
    const { actorUserId } = getPlatformPrincipal(res);
    const body = validated.body<CreateAnnouncementBody>(res);

    const announcement = await announcementService.createDraft({
      title: body.title,
      body: body.body,
      audiences: body.audiences,
      targetSurface: body.targetSurface ?? null,
      targetPath: body.targetPath ?? null,
      expiresAt: body.expiresAt ?? null,
      createdByAdminId: actorUserId,
    });
    sendSuccess(res, announcement, "Announcement drafted.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { id } = validated.params<AnnouncementIdParam>(res);
    const body = validated.body<UpdateAnnouncementBody>(res);

    const announcement = await announcementService.updateDraft(id, {
      title: body.title,
      body: body.body,
      audiences: body.audiences,
      targetSurface: body.targetSurface ?? null,
      targetPath: body.targetPath ?? null,
      expiresAt: body.expiresAt ?? null,
    });
    sendSuccess(res, announcement, "Announcement updated.");
  },

  async list(_req: Request, res: Response) {
    const query = validated.query<ListAnnouncementsQuery>(res);
    const page = await announcementService.list(query);
    sendSuccess(res, page, "Announcements.");
  },

  async getById(_req: Request, res: Response) {
    const { id } = validated.params<AnnouncementIdParam>(res);
    const announcement = await announcementService.getById(id);
    sendSuccess(res, announcement, "Announcement.");
  },

  async send(_req: Request, res: Response) {
    const { id } = validated.params<AnnouncementIdParam>(res);
    const { scheduledAt } = validated.body<SendAnnouncementBody>(res);

    const announcement = await announcementService.send(id, scheduledAt ?? null);
    sendSuccess(res, announcement, scheduledAt ? "Announcement scheduled." : "Announcement sent.");
  },

  async cancel(_req: Request, res: Response) {
    const { actorUserId } = getPlatformPrincipal(res);
    const { id } = validated.params<AnnouncementIdParam>(res);

    await announcementService.cancel(id, actorUserId);
    sendSuccess(res, null, "Announcement canceled.");
  },
};
