"use client";

import { Button, Modal, Skeleton, toast } from "@outfiqe/design-system";
import { Plus } from "lucide-react";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BrandProduct } from "../api/brandProductsSchemas";
import { useBrandProducts } from "../hooks/useBrandProducts";
import { useDeleteProduct } from "../hooks/useDeleteProduct";
import { DiscountModal } from "./DiscountModal";
import { EditProductModal } from "./EditProductModal";
import { ProductActionsMenu } from "./ProductActionsMenu";
import { ProductModal } from "./ProductModal";
import { StockModal } from "./StockModal";

const STATUS_LABEL: Record<BrandProduct["status"], string> = {
  PENDING: "In review",
  APPROVED: "Live",
  REJECTED: "Not approved",
};

const STATUS_CLASS: Record<BrandProduct["status"], string> = {
  PENDING: "bg-muted text-foreground",
  APPROVED: "bg-primary/10 text-primary-strong",
  REJECTED: "bg-destructive/10 text-destructive",
};

export const ProductsSection = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<BrandProduct | null>(null);
  const [stockProduct, setStockProduct] = useState<BrandProduct | null>(null);
  const [discountProduct, setDiscountProduct] = useState<BrandProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<BrandProduct | null>(null);
  const products = useBrandProducts();
  const deleteProduct = useDeleteProduct();
  const { data, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } = products;
  const brandProducts = data?.pages.flatMap((page) => page.products) ?? [];

  const confirmDelete = () => {
    if (!deletingProduct) return;

    deleteProduct.mutate(deletingProduct.id, {
      onSuccess: () => {
        setDeletingProduct(null);
        toast.success("Product deleted");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Your products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {brandProducts.length} product{brandProducts.length === 1 ? "" : "s"} listed
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="size-4" />
          Add product
        </Button>
      </div>

      {isPending && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-2xl" />
          ))}
        </div>
      )}

      {!isPending && brandProducts.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing listed yet — add your first piece.
          </p>
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            Add a product
          </Button>
        </div>
      )}

      {brandProducts.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {brandProducts.map((product) => {
            const { id, imageUrl, name, price, status } = product;

            return (
              <div
                key={id}
                className="overflow-hidden rounded-2xl border border-border transition-colors hover:border-foreground/30"
              >
                <div
                  className="relative aspect-square w-full bg-muted bg-cover bg-center"
                  style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
                >
                  <ProductActionsMenu
                    onEdit={() => setEditingProduct(product)}
                    onManageStock={() => setStockProduct(product)}
                    onManageDiscount={() => setDiscountProduct(product)}
                    onDelete={() => setDeletingProduct(product)}
                    className="absolute right-2 top-2"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                  {product.activeDiscount ? (
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-primary">
                        Rs. {product.effectivePrice.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground line-through">
                        Rs. {price.toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Rs. {price.toLocaleString()}
                    </p>
                  )}
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[status]}`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      <ProductModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} />
      <StockModal product={stockProduct} onClose={() => setStockProduct(null)} />
      <DiscountModal product={discountProduct} onClose={() => setDiscountProduct(null)} />

      <Modal
        open={deletingProduct !== null}
        onClose={() => setDeletingProduct(null)}
        title="Delete this product?"
        description="This can't be undone."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingProduct(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteProduct.isPending}
              className="border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-white"
            >
              {deleteProduct.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {deletingProduct?.status === "APPROVED"
            ? "This product is live — it will disappear from the store immediately."
            : "It will be removed from your product list."}
        </p>
      </Modal>
    </div>
  );
};
