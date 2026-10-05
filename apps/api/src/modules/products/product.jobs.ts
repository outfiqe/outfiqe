import * as Sentry from "@sentry/node";

import logger from "#lib/winston.utils.js";

import { INVENTORY_MISMATCH_REPORT_LIMIT } from "./product.constants.js";
import { productRepository } from "./product.repository.js";
import type { InventoryReconciliationSummary } from "./product.types.js";

export const runInventoryLedgerReconciliation =
  async (): Promise<InventoryReconciliationSummary> => {
    const adoptedUntrackedSizeCount =
      await productRepository.recordOpeningBalancesForUntrackedSizes();
    if (adoptedUntrackedSizeCount > 0) {
      logger.warn(
        `Inventory reconciliation started tracking ${adoptedUntrackedSizeCount} sizes that had no ledger history`,
      );
    }

    const mismatches = await productRepository.findStockLedgerMismatches(
      INVENTORY_MISMATCH_REPORT_LIMIT,
    );
    if (mismatches.length > 0) {
      logger.error(
        `Inventory reconciliation found ${mismatches.length} sizes whose stock does not match the ledger`,
      );
      Sentry.captureMessage("Stock does not match the inventory ledger", {
        level: "error",
        extra: { mismatches },
      });
    }

    return { mismatchedSizeCount: mismatches.length, adoptedUntrackedSizeCount };
  };
