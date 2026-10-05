import type { OutfitBoard, OutfitProduct, OutfitSlot, OutfitSummary } from "../api/outfitSchemas";

export const SITA = { id: "user-sita", name: "Sita Rai", handle: "sita", avatarUrl: null };
export const RAM = { id: "user-ram", name: "Ram Thapa", handle: "ram", avatarUrl: null };

const CREATED_AT = "2026-09-30T10:00:00.000Z";

export const buildSlot = (overrides: Partial<OutfitSlot> = {}): OutfitSlot => ({
  key: "top",
  label: "Top",
  icon: "shirt",
  maxItems: 1,
  acceptsAnyProductType: false,
  productTypeIds: ["type-tops"],
  blocksSlotKeys: [],
  isBlocked: false,
  items: [],
  ...overrides,
});

export const buildBoard = (overrides: Partial<OutfitBoard> = {}): OutfitBoard => ({
  id: "outfit-1",
  title: "Dashain look",
  status: "DRAFT",
  visibility: "PRIVATE",
  version: 4,
  budget: null,
  maxItemsPerMember: null,
  publishedVersion: null,
  lastLockedVersion: null,
  conversationId: null,
  sourceConversationId: null,
  lockedAt: null,
  archivedAt: null,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  myRole: "OWNER",
  members: [
    { user: SITA, role: "OWNER", isHappy: false, joinedAt: CREATED_AT, canReceiveOffers: false },
    { user: RAM, role: "EDITOR", isHappy: false, joinedAt: CREATED_AT, canReceiveOffers: true },
  ],
  slots: [
    buildSlot(),
    buildSlot({
      key: "footwear",
      label: "Footwear",
      icon: "footwear",
      productTypeIds: ["type-footwear"],
    }),
  ],
  itemCount: 0,
  total: 0,
  isOverBudget: false,
  isFullyAvailable: true,
  isEveryoneHappy: false,
  limits: {
    maxItemsPerBoard: 7,
    minItemsToLock: 2,
    maxEditorsPerBoard: 5,
    maxPhotosPerMember: 5,
    maxPhotosPerBoard: 15,
    maxCoverPhotos: 6,
  },
  photos: [],
  ...overrides,
});

export const buildSummary = (overrides: Partial<OutfitSummary> = {}): OutfitSummary => ({
  id: "outfit-1",
  title: "Dashain look",
  status: "DRAFT",
  visibility: "PRIVATE",
  version: 4,
  itemCount: 5,
  memberCount: 2,
  previewImageUrls: [],
  coverPhotos: [],
  myRole: "OWNER",
  updatedAt: CREATED_AT,
  ...overrides,
});

export const PRODUCT_TYPES = [
  { id: "type-tops", slug: "tops", label: "Tops" },
  { id: "type-footwear", slug: "footwear", label: "Footwear" },
];

export const publicProduct = (id: string, type: string, name: string) => ({
  id,
  brand: "Kathmandu Threads",
  name,
  price: 3_200,
  effectivePrice: 3_200,
  discountPercent: null,
  type,
  categorySlugs: [],
  imageUrl: null,
  image: null,
  lowStock: false,
  isNew: false,
  isSaved: false,
  isThrift: false,
  thriftConditionRating: null,
  thriftConditionNotes: null,
  isSoldOut: false,
  creatorBuyerCount: 0,
  unitsSold: 0,
  avgRating: null,
  reviewCount: 0,
});

export const outfitProduct = (overrides: Partial<OutfitProduct> = {}): OutfitProduct => ({
  id: "product-kurta",
  name: "Maroon Kurta",
  imageUrl: null,
  price: 3_200,
  listPrice: 3_200,
  productTypeId: "type-tops",
  brand: { id: "brand-1", name: "Kathmandu Threads" },
  availability: "IN_STOCK",
  sizes: [],
  ...overrides,
});
