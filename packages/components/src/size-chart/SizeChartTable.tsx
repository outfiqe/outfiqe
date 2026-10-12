import { Table, type TableColumn } from "@outfiqe/design-system";
import type { FitRange } from "@outfiqe/utils";

import { formatHeightRange, formatWeightRange } from "./sizeChart.utils";

export type SizeChartRow = {
  id: string;
  label: string;
  fitRange: FitRange | null;
};

type SizeChartTableProps = {
  sizes: SizeChartRow[];
  caption: string;
  highlightedSizeId?: string | null;
  className?: string;
};

const SIZE_CHART_COLUMNS: TableColumn<SizeChartRow>[] = [
  {
    key: "size",
    header: "Size",
    render: ({ label }) => <span className="font-semibold text-foreground">{label}</span>,
  },
  { key: "height", header: "Height (cm)", render: ({ fitRange }) => formatHeightRange(fitRange) },
  { key: "weight", header: "Weight (kg)", render: ({ fitRange }) => formatWeightRange(fitRange) },
];

export const SizeChartTable = ({
  sizes,
  caption,
  highlightedSizeId,
  className,
}: SizeChartTableProps) => (
  <Table
    columns={SIZE_CHART_COLUMNS}
    rows={sizes}
    rowKey={({ id }) => id}
    caption={caption}
    className={className}
    rowClassName={({ id }) => (id === highlightedSizeId ? "bg-primary/10" : undefined)}
    emptyState="No sizes yet."
  />
);
