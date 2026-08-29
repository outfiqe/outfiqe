export const DEFAULT_RELATIONSHIP_PAGE_SIZE = 25;

export const MAX_RELATIONSHIP_PAGE_SIZE = 100;

/**
 * The list endpoints paginate with a bounded offset window rather than an
 * open-ended keyset cursor: a single tenant brand's partner/customer set is
 * modest, and the aggregate sort keys (revenue, spend, last activity) make a
 * keyset cursor awkward. A hard window keeps the query bounded regardless.
 */
export const MAX_RELATIONSHIP_RESULT_WINDOW = 500;

export const RECENT_ACTIVITY_LIMIT = 10;

export const SETTLED_PAYMENT_STATUSES = ["PAID", "DUE", "REFUNDED"] as const;

export const NOT_LINKED_TO_BRAND_REASON = "ORGANIZATION_NOT_LINKED_TO_BRAND";
