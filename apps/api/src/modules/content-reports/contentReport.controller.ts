import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ContentReportIdParam,
  ListContentReportsQuery,
  ResolveContentReportBody,
  SubmitContentReportBody,
} from "./contentReport.schemas.js";
import { contentReportService } from "./contentReport.service.js";

const ACCEPTED_STATUS = 202;

export const contentReportController = {
  async submit(req: Request, res: Response) {
    const body = validated.body<SubmitContentReportBody>(res);
    await contentReportService.submitReport(body, {
      reporterUserId: getAuthPrincipal(res)?.userId,
      reporterIp: req.ip,
      userAgent: req.headers["user-agent"],
    });
    sendSuccess(res, null, "Thanks — our team will take a look.", ACCEPTED_STATUS);
  },

  async list(_req: Request, res: Response) {
    const query = validated.query<ListContentReportsQuery>(res);
    const page = await contentReportService.listReports(query);
    sendSuccess(res, page, "Content reports.");
  },

  async openCount(_req: Request, res: Response) {
    sendSuccess(res, await contentReportService.countOpen(), "Open content report count.");
  },

  async resolve(_req: Request, res: Response) {
    const { id } = validated.params<ContentReportIdParam>(res);
    const body = validated.body<ResolveContentReportBody>(res);
    const principal = requireAuthPrincipal(res);
    const result = await contentReportService.resolveReport(id, principal, body);
    sendSuccess(res, result, "Report resolved.");
  },
};
