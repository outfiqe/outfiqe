import { Badge, Button, Modal } from "@outfiqe/design-system";
import { THRIFT_CONDITION_LABEL } from "@outfiqe/utils";

import type { Product, ProductStatusValue } from "./schemas";

const STATUS_TONE: Record<ProductStatusValue, "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  APPROVED: "positive",
  REJECTED: "negative",
};

type ProductDetailModalProps = {
  product: Product;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  isMutating: boolean;
};

export const ProductDetailModal = ({
  product,
  onClose,
  onApprove,
  onReject,
  isMutating,
}: ProductDetailModalProps) => {
  const {
    name,
    imageUrl,
    status,
    lowStock,
    brand,
    price,
    productType,
    categories,
    isThrift,
    thriftConditionRating,
    thriftConditionNotes,
    createdAt,
  } = product;

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel={name}
      className="h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-2xl"
    >
      <div className="-mx-6 -my-5 flex flex-col sm:h-[32rem] sm:flex-row">
        {imageUrl ? (
          <div
            className="aspect-square shrink-0 border-b border-border bg-muted bg-cover bg-center sm:aspect-auto sm:h-full sm:w-1/2 sm:border-b-0 sm:border-r"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        ) : (
          <div className="flex aspect-square shrink-0 items-center justify-center border-b border-border bg-muted text-sm text-muted-foreground sm:aspect-auto sm:h-full sm:w-1/2 sm:border-b-0 sm:border-r">
            No image
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-foreground">{name}</h2>
            <Badge tone={STATUS_TONE[status]} showDot={false}>
              {status}
            </Badge>
            {lowStock && (
              <Badge tone="negative" showDot={false}>
                Low stock
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">{brand.name}</p>
          <p className="mt-3 font-display text-xl font-bold text-foreground">
            Rs. {price.toLocaleString()}
          </p>

          <p className="mt-3 text-sm text-muted-foreground">
            {productType.label} &middot; {categories.join(", ")}
          </p>

          {isThrift && (
            <div className="mt-3 rounded-lg bg-thrift/10 p-3">
              <span className="rounded-full bg-thrift/10 text-[11px] font-bold uppercase tracking-wide text-thrift-strong">
                Thrift
                {thriftConditionRating && ` · ${THRIFT_CONDITION_LABEL[thriftConditionRating]}`}
              </span>
              {thriftConditionNotes && (
                <p className="mt-1.5 text-sm text-foreground">{thriftConditionNotes}</p>
              )}
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Submitted{" "}
            {new Date(createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>

          {status === "PENDING" && (
            <div className="mt-auto flex gap-2 pt-4">
              <Button onClick={onApprove} disabled={isMutating}>
                Approve
              </Button>
              <Button variant="outline" onClick={onReject} disabled={isMutating}>
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
