import { toast } from "@outfiqe/design-system";
import { useState } from "react";

import { financialRollupApi } from "../api/financialRollupApi";
import type { LedgerFilters } from "../api/financialRollupSchemas";

const EXPORT_FILE_NAME = "order-ledger.csv";

const saveFile = (file: Blob, fileName: string) => {
  const fileUrl = URL.createObjectURL(file);
  const downloadLink = document.createElement("a");
  downloadLink.href = fileUrl;
  downloadLink.download = fileName;
  downloadLink.click();
  URL.revokeObjectURL(fileUrl);
};

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
