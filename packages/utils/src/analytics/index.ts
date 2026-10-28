export const ANALYTICS_EVENTS = {
  USER_CREATE: "account:user_create",
  EMAIL_VERIFY: "account:email_verify",
  CREATOR_APPLICATION_APPROVE: "creator:application_approve",
  BRAND_APPLICATION_SUBMIT: "brand:application_submit",
  LOOK_POST_CREATE: "look:post_create",
  LOOK_PRODUCT_TAG_APPROVE: "look:product_tag_approve",
  ORDER_PLACE: "checkout:order_place",
  ORDER_STATUS_CHANGE: "order:status_change",
  ORDER_REFUND_ISSUE: "order:refund_issue",
  COMMISSION_EARN: "creator:commission_earn",
  CREATOR_FOLLOW: "social:creator_follow",
  BRAND_FOLLOW: "social:brand_follow",
  CREATOR_LINK_CLICK: "creator_link:link_click",
  SUPPORT_TICKET_CREATE: "support:ticket_create",
  LOOK_DETAIL_VIEW: "look:detail_view",
  LOOK_PRODUCT_TAG_CLICK: "look:product_tag_click",
  PRODUCT_DETAIL_VIEW: "product:detail_view",
  WISHLIST_ITEM_ADD: "wishlist:item_add",
  CART_ITEM_ADD: "cart:item_add",
  CART_ITEM_REMOVE: "cart:item_remove",
  CHECKOUT_START: "checkout:checkout_start",
  PAYMENT_METHOD_SELECT: "checkout:payment_method_select",
  ORDER_SUBMIT: "checkout:order_submit",
  PAYMENT_FAIL: "checkout:payment_fail",
  SEARCH_QUERY_SUBMIT: "search:query_submit",
  TASTE_CATEGORY_SELECT: "taste:category_select",
  OUTFIT_BUILD_CREATE: "outfit_build:build_create",
  OUTFIT_BUILD_PUBLISH: "outfit_build:build_publish",
  PWA_INSTALL: "app:pwa_install",
  PUSH_ENABLE: "app:push_enable",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const ANALYTICS_EVENT_NAME_PATTERN = /^[a-z]+(?:_[a-z]+)*:[a-z]+(?:_[a-z]+)*$/;

export const ANALYTICS_PAYMENT_METHODS = ["cod", "esewa", "khalti"] as const;
export type AnalyticsPaymentMethod = (typeof ANALYTICS_PAYMENT_METHODS)[number];

export const ANALYTICS_SIGNUP_METHODS = ["email", "oauth", "staff_created"] as const;
export type AnalyticsSignupMethod = (typeof ANALYTICS_SIGNUP_METHODS)[number];

export const ANALYTICS_TRACKED_ORDER_STATUSES = ["delivered", "cancelled", "returned"] as const;
export type AnalyticsTrackedOrderStatus = (typeof ANALYTICS_TRACKED_ORDER_STATUSES)[number];

export const ANALYTICS_CREATOR_LINK_TYPES = ["internal_single_use", "external_reusable"] as const;
export type AnalyticsCreatorLinkType = (typeof ANALYTICS_CREATOR_LINK_TYPES)[number];

export const ANALYTICS_SEARCH_SCOPES = ["explore", "products"] as const;
export type AnalyticsSearchScope = (typeof ANALYTICS_SEARCH_SCOPES)[number];

export const ANALYTICS_SEARCH_QUERY_MAX_LENGTH = 100;

type NoProperties = Record<string, never>;

export type AnalyticsEventProperties = {
  [ANALYTICS_EVENTS.USER_CREATE]: { signup_method: AnalyticsSignupMethod; user_role: string };
  [ANALYTICS_EVENTS.EMAIL_VERIFY]: NoProperties;
  [ANALYTICS_EVENTS.CREATOR_APPLICATION_APPROVE]: NoProperties;
  [ANALYTICS_EVENTS.BRAND_APPLICATION_SUBMIT]: { application_id: string };
  [ANALYTICS_EVENTS.LOOK_POST_CREATE]: { look_id: string; product_tag_count: number };
  [ANALYTICS_EVENTS.LOOK_PRODUCT_TAG_APPROVE]: {
    look_id: string;
    product_id: string;
    creator_id: string;
  };
  [ANALYTICS_EVENTS.ORDER_PLACE]: {
    order_id: string;
    order_total_npr: number;
    cart_item_count: number;
    brand_count: number;
    payment_method: AnalyticsPaymentMethod;
    is_first_order: boolean;
    has_creator_attribution: boolean;
    has_coupon: boolean;
  };
  [ANALYTICS_EVENTS.ORDER_STATUS_CHANGE]: {
    order_id: string;
    order_status: AnalyticsTrackedOrderStatus;
  };
  [ANALYTICS_EVENTS.ORDER_REFUND_ISSUE]: {
    order_id: string;
    refund_amount_npr: number;
    refund_outcome: string;
  };
  [ANALYTICS_EVENTS.COMMISSION_EARN]: { order_item_id: string; commission_amount_npr: number };
  [ANALYTICS_EVENTS.CREATOR_FOLLOW]: { creator_id: string };
  [ANALYTICS_EVENTS.BRAND_FOLLOW]: { brand_id: string };
  [ANALYTICS_EVENTS.CREATOR_LINK_CLICK]: {
    creator_id: string;
    product_id: string;
    link_type: AnalyticsCreatorLinkType;
  };
  [ANALYTICS_EVENTS.SUPPORT_TICKET_CREATE]: { ticket_id: string };
  [ANALYTICS_EVENTS.LOOK_DETAIL_VIEW]: { look_id: string; creator_id: string };
  [ANALYTICS_EVENTS.LOOK_PRODUCT_TAG_CLICK]: {
    look_id: string;
    product_id: string;
  };
  [ANALYTICS_EVENTS.PRODUCT_DETAIL_VIEW]: {
    product_id: string;
    brand_id: string;
    product_price_npr: number;
    is_thrift: boolean;
  };
  [ANALYTICS_EVENTS.WISHLIST_ITEM_ADD]: { product_id: string };
  [ANALYTICS_EVENTS.CART_ITEM_ADD]: {
    product_id: string;
    item_quantity: number;
    product_price_npr: number | null;
    cart_item_count: number;
  };
  [ANALYTICS_EVENTS.CART_ITEM_REMOVE]: { product_id: string | null; cart_item_count: number };
  [ANALYTICS_EVENTS.CHECKOUT_START]: {
    cart_value_npr: number;
    cart_item_count: number;
    is_buy_now: boolean;
  };
  [ANALYTICS_EVENTS.PAYMENT_METHOD_SELECT]: { payment_method: AnalyticsPaymentMethod };
  [ANALYTICS_EVENTS.ORDER_SUBMIT]: {
    payment_method: AnalyticsPaymentMethod;
    is_buy_now: boolean;
    has_coupon: boolean;
  };
  [ANALYTICS_EVENTS.PAYMENT_FAIL]: {
    order_id: string;
    payment_method: AnalyticsPaymentMethod | null;
  };
  [ANALYTICS_EVENTS.SEARCH_QUERY_SUBMIT]: {
    search_scope: AnalyticsSearchScope;
    search_query: string;
    result_count: number;
    is_zero_result: boolean;
  };
  [ANALYTICS_EVENTS.TASTE_CATEGORY_SELECT]: { category_count: number };
  [ANALYTICS_EVENTS.OUTFIT_BUILD_CREATE]: { build_id: string };
  [ANALYTICS_EVENTS.OUTFIT_BUILD_PUBLISH]: { build_id: string };
  [ANALYTICS_EVENTS.PWA_INSTALL]: NoProperties;
  [ANALYTICS_EVENTS.PUSH_ENABLE]: NoProperties;
};

export const toAnalyticsPaymentMethod = (paymentMethod: string): AnalyticsPaymentMethod | null => {
  const normalised = paymentMethod.toLowerCase();
  return ANALYTICS_PAYMENT_METHODS.find((method) => method === normalised) ?? null;
};

export const toAnalyticsSearchQuery = (rawQuery: string): string =>
  rawQuery.trim().toLowerCase().slice(0, ANALYTICS_SEARCH_QUERY_MAX_LENGTH);
