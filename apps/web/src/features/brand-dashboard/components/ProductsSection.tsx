"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { Plus } from "lucide-react";
import { useState } from "react";

import type { BrandProduct } from "../api/brandProductsSchemas";
import { useBrandProducts } from "../hooks/useBrandProducts";
import { ProductModal } from "./ProductModal";

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

export function ProductsSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const products = useBrandProducts();
  const items = products.data?.pages.flatMap((page) => page.products) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Your products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} product{items.length === 1 ? "" : "s"} listed
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="size-4" />
          Add product
        </Button>
      </div>

      {products.isLoading && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-2xl" />
          ))}
        </div>
      )}

      {!products.isLoading && items.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing listed yet — add your first piece.
          </p>
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            Add a product
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <div
              key={product.id}
              className="overflow-hidden rounded-2xl border border-border transition-colors hover:border-foreground/30"
            >
              <div
                className="aspect-square w-full bg-muted bg-cover bg-center"
                style={
                  product.imageUrl ? { backgroundImage: `url(${product.imageUrl})` } : undefined
                }
              />
              <div className="p-3">
                <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Rs. {product.price.toLocaleString()}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[product.status]}`}
                >
                  {STATUS_LABEL[product.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {products.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => void products.fetchNextPage()}
            disabled={products.isFetchingNextPage}
          >
            {products.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      <ProductModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
