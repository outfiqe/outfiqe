import { Skeleton } from "@outfiqe/design-system";

import { SkeletonButton } from "./SkeletonControls";

const DEFAULT_ROW_COUNT = 8;
const FIRST_COLUMN_INDEX = 0;
const NEXT_COLUMN_STEP = 1;

type TableSkeletonProps = {
  headers: readonly string[];
  rowCount?: number;
};

export const TableSkeleton = ({ headers, rowCount = DEFAULT_ROW_COUNT }: TableSkeletonProps) => {
  const lastColumnIndex = headers.length - NEXT_COLUMN_STEP;
  const cellClassFor = (columnIndex: number) =>
    columnIndex === lastColumnIndex ? "py-2" : "py-2 pr-4";

  return (
    <div className="overflow-x-auto" role="status" aria-label="Loading">
      <table className="w-full text-left text-sm" aria-hidden>
        <thead className="text-xs uppercase text-muted-foreground">
          <tr>
            {headers.map((header, columnIndex) => (
              <th key={columnIndex} className={cellClassFor(columnIndex)}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }, (_unused, rowIndex) => (
            <tr key={rowIndex} className="border-t border-border">
              {headers.map((header, columnIndex) => (
                <td key={columnIndex} className={cellClassFor(columnIndex)}>
                  {header === "" ? (
                    <SkeletonButton size="sm" label="Delete" className="ml-auto" />
                  ) : (
                    <Skeleton
                      className={columnIndex === FIRST_COLUMN_INDEX ? "h-5 w-40" : "h-5 w-20"}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
