import type { AdminPageSkeletonSpec } from "./adminPageSkeleton.types";
import { FEATURES_DIR, PILL_COUNT, ROW_COUNT } from "./pageSkeletonSpecs.constants";

export const catalogPageSkeletonSpecs: Record<string, AdminPageSkeletonSpec> = {
  "/products": {
    title: "Products",
    blocks: [
      { kind: "filterTabs", labels: ["Pending", "Approved", "Rejected"] },
      {
        kind: "cardRows",
        count: ROW_COUNT,
        hasBadge: false,
        textLineCount: 2,
        leadingImageClass: "size-16",
        actionLabels: [],
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/products/components/ProductsPage.tsx`],
  },
  "/categories": {
    title: "Categories",
    blocks: [
      {
        kind: "formCard",
        fields: [
          { label: "Name", width: "large" },
          { label: "Slug", width: "medium" },
          { label: "Image", isImage: true },
        ],
        submitLabel: "Create category",
      },
      { kind: "reorderRows", count: ROW_COUNT, hasImage: true, actionLabel: "Unpublish" },
    ],
    sourceFiles: [`${FEATURES_DIR}/categories/components/CategoriesPage.tsx`],
  },
  "/collections": {
    title: "Collections",
    blocks: [
      {
        kind: "formCard",
        fields: [
          { label: "Name", width: "medium" },
          { label: "Slug", width: "medium" },
          { label: "Description", width: "large" },
          { label: "Image", isImage: true },
        ],
        submitLabel: "Create collection",
      },
      { kind: "imageRows", count: ROW_COUNT, actionLabels: ["Manage products", "Unpublish"] },
    ],
    sourceFiles: [`${FEATURES_DIR}/collections/components/CollectionsPage.tsx`],
  },
  "/hero-slides": {
    title: "Hero slides",
    blocks: [
      {
        kind: "formCard",
        fields: [
          { label: "Tag", width: "large" },
          { label: "Title", width: "large" },
          { label: "Description", width: "large" },
          { label: "CTA label", width: "medium" },
          { label: "CTA link", width: "large" },
          { label: "Image", isImage: true },
        ],
        submitLabel: "Create slide",
      },
      { kind: "imageRows", count: ROW_COUNT, actionLabels: ["Unpublish"] },
    ],
    sourceFiles: [`${FEATURES_DIR}/hero-slides/components/HeroSlidesPage.tsx`],
  },
  "/product-types": {
    title: "Garment types",
    description:
      "The list of clothing types a product can be. A new type reaches brands once it is on and has at least one size.",
    blocks: [
      {
        kind: "formCard",
        fields: [
          { label: "Name", width: "medium" },
          { label: "Slug", width: "medium" },
        ],
        submitLabel: "Create type",
      },
      { kind: "reorderRows", count: ROW_COUNT, actionLabel: "Switch off" },
    ],
    sourceFiles: [`${FEATURES_DIR}/product-types/components/ProductTypesPage.tsx`],
  },
  "/size-options": {
    title: "Sizes",
    description: "The size list a brand picks from when adding a product, per garment type.",
    blocks: [
      { kind: "pills", count: PILL_COUNT },
      { kind: "formCard", fields: [{ label: "Size label", width: "small" }] },
      { kind: "actionRows", count: ROW_COUNT, actionLabel: "Delete" },
    ],
    sourceFiles: [`${FEATURES_DIR}/size-options/components/SizeOptionsPage.tsx`],
  },
  "/outfit-slot-types": {
    title: "Outfit slots",
    description:
      "The slots every new Outfit Build starts with, in this order. Each slot says which garment types can fill it and how many items it holds.",
    blocks: [{ kind: "reorderRows", count: ROW_COUNT, actionLabel: "Switch off" }],
    sourceFiles: [`${FEATURES_DIR}/outfit-slot-types/components/OutfitSlotTypesPage.tsx`],
  },
};
