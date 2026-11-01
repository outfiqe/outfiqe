import { Button } from "@outfiqe/design-system";

const FIRST_PAGE = 1;
const PAGE_STEP = 1;

export const CrmPagination = ({
  total,
  page,
  hasMore,
  onPageChange,
}: {
  total: number;
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}) => (
  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
    <span>{total.toLocaleString()} total</span>
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={page === FIRST_PAGE}
        onClick={() => onPageChange(page - PAGE_STEP)}
      >
        Previous
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={!hasMore}
        onClick={() => onPageChange(page + PAGE_STEP)}
      >
        Next
      </Button>
    </div>
  </div>
);
