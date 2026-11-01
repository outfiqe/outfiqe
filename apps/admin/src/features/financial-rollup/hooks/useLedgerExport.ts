import { toast } from "@outfiqe/design-system";
import { useState } from "react";

import { saveFile } from "@/lib/saveFile";

import { financialRollupApi } from "../api/financialRollupApi";
import type { LedgerFilters } from "../api/financialRollupSchemas";

const EXPORT_FILE_NAME = "order-ledger.csv";

export const useLedgerExport = (filters: LedgerFilters) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportLedger = async () => {
    setIsExporting(true);
    try {
      saveFile(await financialRollupApi.exportLedger(filters), EXPORT_FILE_NAME);
    } catch {
      toast.error("Couldn't export the ledger. Try a shorter period.");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportLedger, isExporting };
};
