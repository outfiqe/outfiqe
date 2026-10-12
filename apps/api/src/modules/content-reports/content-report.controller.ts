import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ContentReportIdParam,
  ListContentReportsQuery,
  ResolveContentReportBody,
  SubmitContentReportBody,
} from "./content-report.schemas.js";
import { contentReportService } from "./content-report.service.js";

export const contentReportController = {
  async submit(req: Request, res: Response) {
    const body = validated.body<SubmitContentReportBody>(res);
    await contentReportService.submitReport(body, {
      reporterUserId: getAuthPrincipal(res)?.userId,
      reporterIp: req.ip,
      userAgent: req.headers["user-agent"],
    });
    sendSuccess(res, null, "Thanks — our team will take a look.", HTTP_STATUS.ACCEPTED);
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
