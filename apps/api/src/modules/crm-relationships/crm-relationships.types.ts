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
  tagClickCount: number;
  attributedOrderCount: number;
  attributedRevenue: number;
};

export type PartnerAttributedOrderRow = {
  orderItemId: string;
  orderId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  paymentStatus: string;
  fulfilmentStatus: string;
  createdAt: string;
};

export type PartnerDetail = PartnerSummary & {
  productBreakdown: PartnerProductBreakdownRow[];
  recentAttributedOrders: PartnerAttributedOrderRow[];
};

export type CustomerOrderRow = {
  orderId: string;
  itemCount: number;
  brandSubtotal: number;
  paymentStatus: string;
  fulfilmentStatus: string;
  createdAt: string;
};

export type CustomerDetail = CustomerSummary & {
  recentOrders: CustomerOrderRow[];
};
