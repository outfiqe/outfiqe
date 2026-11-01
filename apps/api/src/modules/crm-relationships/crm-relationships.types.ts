export type RelationshipListReason = "ORGANIZATION_NOT_LINKED_TO_BRAND" | null;

export type PartnerSummary = {
  creatorId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  tagClickCount: number;
  attributedOrderCount: number;
  attributedRevenue: number;
  lastActivityAt: string | null;
};

export type CustomerSummary = {
  userId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  orderCount: number;
  itemCount: number;
  totalPaid: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
};

export type RelationshipListPage<TItem> = {
  items: TItem[];
  total: number;
  hasMore: boolean;
  reason: RelationshipListReason;
};

export type PartnerProductBreakdownRow = {
  productId: string;
  productName: string;
  imageUrl: string | null;
  price: number;
  isThrift: boolean;
  isLive: boolean;
  tagClickCount: number;
  attributedOrderCount: number;
  attributedRevenue: number;
};

export type RelationshipOrderLine = {
  orderItemId: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  sizeLabel: string;
  qty: number;
  unitPrice: number;
  refundedQty: number;
  isLive: boolean;
};

export type RelationshipOrderRow = {
  orderId: string;
  itemCount: number;
  brandSubtotal: number;
  paymentMethod: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  deliveredAt: string | null;
  createdAt: string;
  lines: RelationshipOrderLine[];
};

export type PartnerDetail = PartnerSummary & {
  productBreakdown: PartnerProductBreakdownRow[];
  recentAttributedOrders: RelationshipOrderRow[];
};

export type CustomerDetail = CustomerSummary & {
  recentOrders: RelationshipOrderRow[];
};
