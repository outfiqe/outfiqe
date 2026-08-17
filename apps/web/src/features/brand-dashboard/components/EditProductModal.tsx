"use client";

import { Modal } from "@outfiqe/design-system";

import type { BrandProduct } from "../api/brandProductsSchemas";
import { EditProductForm } from "./EditProductForm";

type EditProductModalProps = {
  product: BrandProduct | null;
  onClose: () => void;
};

export const EditProductModal = ({ product, onClose }: EditProductModalProps) => {
  return (
    <Modal
      open={product !== null}
      onClose={onClose}
      title="Edit product"
      description="Changes apply immediately, even if this product is already live."
    >
      {product && <EditProductForm key={product.id} product={product} onClose={onClose} />}
    </Modal>
  );
};
