import { Button } from "@outfiqe/design-system";
import { Download } from "lucide-react";

export const CsvExportButton = ({
  isExporting,
  onExport,
}: {
  isExporting: boolean;
  onExport: () => void;
}) => (
  <Button size="sm" variant="outline" isLoading={isExporting} onClick={onExport}>
    <Download className="size-4" aria-hidden />
    Export CSV
  </Button>
);
