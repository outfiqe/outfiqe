import { toast } from "@outfiqe/design-system";
import { useState } from "react";

import { saveFile } from "@/lib/saveFile";

export const useCrmCsvExport = (
  downloadFile: () => Promise<Blob>,
  fileName: string,
  failureMessage: string,
) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      saveFile(await downloadFile(), fileName);
    } catch {
      toast.error(failureMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportCsv, isExporting };
};
