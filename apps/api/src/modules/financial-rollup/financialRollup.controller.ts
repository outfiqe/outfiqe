import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import logger from "#lib/winston.utils.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  FinancialLedgerExportQuery,
  FinancialLedgerQuery,
  FinancialRollupQuery,
} from "./financialRollup.schemas.js";
import { financialRollupService } from "./financialRollup.service.js";

const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

export const financialRollupController = {
  async get(_req: Request, res: Response) {
    const query = validated.query<FinancialRollupQuery>(res);
    const rollup = await financialRollupService.getRollup(query);
    sendSuccess(res, rollup, "Financial rollup.");
  },

  async ledger(_req: Request, res: Response) {
    const query = validated.query<FinancialLedgerQuery>(res);
    const page = await financialRollupService.getLedger(query);
    sendSuccess(res, page, "Financial ledger.");
  },

  async exportLedger(_req: Request, res: Response) {
    const query = validated.query<FinancialLedgerExportQuery>(res);
    const { csv, rowCount } = await financialRollupService.exportLedgerCsv(query);

    const exporterId = getAuthPrincipal(res)?.userId ?? "unknown";
    logger.info(
      `Financial ledger export: exporter=${exporterId} rows=${rowCount} filter=${JSON.stringify(query)}`,
    );

    res
      .status(200)
      .set("Content-Type", CSV_CONTENT_TYPE)
      .set("Content-Disposition", `attachment; filename="financial-ledger-${Date.now()}.csv"`)
      .send(csv);
  },
};
