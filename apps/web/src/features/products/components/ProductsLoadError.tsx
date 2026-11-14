import { LoadErrorNotice } from "@/shared/components/LoadErrorNotice";

type ProductsLoadErrorProps = {
  onRetry: () => void;
};

export const ProductsLoadError = ({ onRetry }: ProductsLoadErrorProps) => (
  <LoadErrorNotice
    className="mt-12"
    message="We couldn't load these pieces. Check your connection and try again."
    onRetry={onRetry}
  />
);
