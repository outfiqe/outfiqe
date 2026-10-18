import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type {
  ListWebhookReceiptsQuery,
  PartnerReceiptsParam,
  PartnerWebhookParam,
  ReplayWebhookReceiptsBody,
} from "./partner-webhook.schemas.js";
import { logisticsPartnerWebhookService } from "./partner-webhook.service.js";

const toHeaderRecord = (headers: Request["headers"]): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).flatMap(([name, value]) =>
      value === undefined
        ? []
        : [[name.toLowerCase(), Array.isArray(value) ? value.join(",") : value]],
    ),
  );

const toRawBody = (body: unknown): Buffer => (Buffer.isBuffer(body) ? body : Buffer.alloc(0));

export const logisticsPartnerWebhookController = {
  async receive(req: Request, res: Response) {
    const { partnerCode } = validated.params<PartnerWebhookParam>(res);
    const outcome = await logisticsPartnerWebhookService.receivePartnerWebhook(
      partnerCode,
      toHeaderRecord(req.headers),
      toRawBody(req.body),
    );
    sendSuccess(res, outcome, "Received.");
  },

  async listReceipts(_req: Request, res: Response) {
    const { partnerId } = validated.params<PartnerReceiptsParam>(res);
    const page = await logisticsPartnerWebhookService.listWebhookReceipts(
      partnerId,
      validated.query<ListWebhookReceiptsQuery>(res),
    );
    sendSuccess(res, page, "Partner updates received.");
  },

  async replay(_req: Request, res: Response) {
    const { partnerId } = validated.params<PartnerReceiptsParam>(res);
    const replay = await logisticsPartnerWebhookService.replayWebhookReceipts(
      partnerId,
      validated.body<ReplayWebhookReceiptsBody>(res),
    );
    sendSuccess(res, replay, "Updates sent again.");
  },
};
