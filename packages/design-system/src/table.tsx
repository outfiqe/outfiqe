import type { ReactNode } from "react";

import { cn } from "./cn";

export type TableColumn<Row> = {
  readonly key: string;
  readonly header: string;
  readonly render: (row: Row) => ReactNode;
  readonly align?: "left" | "right";
};

type TableProps<Row> = {
  readonly columns: TableColumn<Row>[];
  readonly rows: Row[];
  readonly rowKey: (row: Row) => string;
  readonly footer?: ReactNode;
  readonly emptyState?: ReactNode;
  readonly className?: string;
};

const alignClass = (align: TableColumn<unknown>["align"]) =>
  align === "right" ? "text-right" : "text-left";

export const Table = <Row,>({
  columns,
  rows,
  rowKey,
  footer,
  emptyState,
  className,
}: TableProps<Row>) => (
  <div className={cn("overflow-x-auto rounded-xl border border-border", className)}>
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cn(
                "px-4 py-2.5 font-semibold text-muted-foreground",
                alignClass(column.align),
              )}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
              {emptyState ?? "Nothing to show."}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-border">
              {columns.map((column) => (
                <td key={column.key} className={cn("px-4 py-2.5", alignClass(column.align))}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
      {footer && rows.length > 0 && (
        <tfoot className="border-t border-border bg-muted/30 font-medium text-foreground">
          {footer}
        </tfoot>
      )}
    </table>
  </div>
);
