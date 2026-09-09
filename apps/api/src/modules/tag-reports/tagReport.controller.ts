import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ListTagReportsQuery,
  ResolveTagReportBody,
  SubmitTagReportBody,
  TagReportIdParam,
} from "./tagReport.schemas.js";
import { tagReportService } from "./tagReport.service.js";

const ACCEPTED_STATUS = 202;

export const tagReportController = {
  async submit(req: Request, res: Response) {
    const body = validated.body<SubmitTagReportBody>(res);
    await tagReportService.submitReport(body, {
      reporterUserId: getAuthPrincipal(res)?.userId,
      reporterIp: req.ip,
      userAgent: req.headers["user-agent"],
    });
    sendSuccess(res, null, "Thanks — we'll take a look.", ACCEPTED_STATUS);
  },

  async list(_req: Request, res: Response) {
    const query = validated.query<ListTagReportsQuery>(res);
    const page = await tagReportService.listReports(query);
    sendSuccess(res, page, "Tag reports.");
  },

  async openCount(_req: Request, res: Response) {
    sendSuccess(res, await tagReportService.countOpen(), "Open tag report count.");
  },

  async resolve(_req: Request, res: Response) {
    const { id } = validated.params<TagReportIdParam>(res);
    const body = validated.body<ResolveTagReportBody>(res);
    const { userId } = requireAuthPrincipal(res);
    const result = await tagReportService.resolveReport(id, userId, body);
    sendSuccess(res, result, "Report resolved.");
  },
};
