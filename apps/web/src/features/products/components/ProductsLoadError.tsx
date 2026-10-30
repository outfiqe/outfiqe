import { Button } from "@outfiqe/design-system";

type ProductsLoadErrorProps = {
  onRetry: () => void;
};

export const ProductsLoadError = ({ onRetry }: ProductsLoadErrorProps) => (
  <div role="alert" className="mt-12 flex flex-col items-start gap-3">
    <p className="text-sm text-muted-foreground">
      We couldn&apos;t load these pieces. Check your connection and try again.
    </p>
    <Button variant="outline" size="sm" onClick={onRetry}>
      Try again
    </Button>
  </div>
);
