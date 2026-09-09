export const WEB_NOTIFICATION_ROUTES = {
  dashboardProfile: "/profile",
  badges: "/badges",
  progress: "/progress",
  earnings: "/earnings",
  wallet: "/wallet",
  manageOrders: "/manage-orders",
  ordersList: "/orders",
  brandProducts: "/products",
  tagReviews: "/tag-reviews",
  messagesList: "/messages",
  supportList: "/support",
} as const;

export const ADMIN_APP_ROUTES = {
  brandApplications: "/platform/brand-applications",
  supportList: "/support",
  crmTasks: "/crm/tasks",
  crmSupport: "/crm/support",
  coupons: "/coupons",
  ordersList: "/orders",
} as const;

const CREATOR_PROFILE_PREFIX = "/creator";
const BRAND_PROFILE_PREFIX = "/brand";
const PRODUCT_DETAIL_PREFIX = "/product";

export const creatorProfilePath = (handle: string): string => `${CREATOR_PROFILE_PREFIX}/${handle}`;

export const creatorLookEditPath = (handle: string, lookId: string): string =>
  `${CREATOR_PROFILE_PREFIX}/${handle}?edit=${lookId}`;

export const brandProfilePath = (brandId: string): string => `${BRAND_PROFILE_PREFIX}/${brandId}`;

export const orderDetailPath = (basePath: string, orderId: string): string =>
  `${basePath}/${orderId}`;

export const productReviewPath = (productId: string): string =>
  `${PRODUCT_DETAIL_PREFIX}/${productId}?review=write#reviews`;

export const conversationPath = (conversationId: string): string =>
  `${WEB_NOTIFICATION_ROUTES.messagesList}/${conversationId}`;

export const customerSupportTicketPath = (ticketId: string | null): string =>
  ticketId
    ? `${WEB_NOTIFICATION_ROUTES.supportList}?ticket=${ticketId}`
    : WEB_NOTIFICATION_ROUTES.supportList;

export const adminSupportTicketPath = (adminBaseUrl: string, ticketId: string | null): string =>
  ticketId
    ? `${adminBaseUrl}${ADMIN_APP_ROUTES.supportList}/${ticketId}`
    : `${adminBaseUrl}${ADMIN_APP_ROUTES.supportList}`;
