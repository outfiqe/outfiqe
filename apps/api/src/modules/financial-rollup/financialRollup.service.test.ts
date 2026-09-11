import { beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentMethod } from "#generated/prisma/enums.js";

import { MAX_LEDGER_EXPORT_ROWS } from "./financialRollup.constants.js";
import type { LedgerRow } from "./financialRollup.types.js";

const listLedger = vi.fn();

vi.mock("./financialRollup.repository.js", () => ({
  financialRollupRepository: {
    listLedger: (...args: unknown[]) => listLedger(...args),
  },
}));

const { financialRollupService } = await import("./financialRollup.service.js");

const buildRows = (count: number): LedgerRow[] =>
  Array.from({ length: count }, (_, index) => ({
    orderId: `order-${index}`,
    orderItemId: `item-${index}`,
    createdAt: new Date(),
    paymentMethod: PaymentMethod.COD,
    grossAmount: 1000,
    platformFee: 50,
    gatewayFee: 0,
    brandNetAmount: 950,
    brandPayoutStatus: "WITHDRAWN",
    creatorCommissionAmount: null,
    creatorCommissionStatus: null,
  }));

beforeEach(() => {
  listLedger.mockReset();
});

describe("financialRollupService.exportLedgerCsv", () => {
  it("returns the CSV and row count when the filtered set fits within the cap", async () => {
    listLedger.mockResolvedValue(buildRows(3));

    const result = await financialRollupService.exportLedgerCsv({});

    expect(result.rowCount).toBe(3);
    expect(result.csv.split("\r\n")).toHaveLength(4);
  });

  it("rejects with a 400 AppError instead of silently truncating when the filtered set exceeds the cap", async () => {
    listLedger.mockResolvedValue(buildRows(MAX_LEDGER_EXPORT_ROWS + 1));

    await expect(financialRollupService.exportLedgerCsv({})).rejects.toThrow(
      expect.objectContaining({ status: 400, code: "LEDGER_EXPORT_TOO_LARGE" }),
    );
  });

  it("requests the export cap as the repository limit, not the default page size", async () => {
    listLedger.mockResolvedValue([]);

    await financialRollupService.exportLedgerCsv({});

    expect(listLedger).toHaveBeenCalledWith(
      expect.objectContaining({ limit: MAX_LEDGER_EXPORT_ROWS }),
    );
  });
});
