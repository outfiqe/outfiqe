import type {
  SupportCategoryValue,
  SupportPriorityValue,
  SupportSegmentValue,
  SupportStatusValue,
} from "./schemas";

export const STATUS_LABELS: Record<SupportStatusValue, string> = {
  NEW: "New",
  OPEN: "Open",
  WAITING_ON_CUSTOMER: "Waiting on customer",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const STATUS_TONE: Record<SupportStatusValue, "neutral" | "positive" | "negative"> = {
  NEW: "negative",
  OPEN: "neutral",
  WAITING_ON_CUSTOMER: "neutral",
  RESOLVED: "positive",
  CLOSED: "neutral",
};

export const CATEGORY_LABELS: Record<SupportCategoryValue, string> = {
  ORDER_ISSUE: "Order issue",
  PAYMENT: "Payment",
  RETURN_REFUND: "Return / refund",
  DELIVERY: "Delivery",
  ACCOUNT_ACCESS: "Account access",
  CREATOR_PROGRAM: "Creator programme",
  BRAND_PARTNER: "Brand / partner",
  REPORT_CONTENT: "Report content",
  FEEDBACK: "Feedback",
  OTHER: "Other",
};

export const SEGMENT_LABELS: Record<SupportSegmentValue, string> = {
  SHOPPER: "Shopper",
  CREATOR: "Creator",
  BRAND: "Brand",
  GUEST: "Guest",
};

export const PRIORITY_LABELS: Record<SupportPriorityValue, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_VALUES: SupportPriorityValue[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
export const STATUS_FILTER_VALUES: SupportStatusValue[] = [
  "NEW",
  "OPEN",
  "WAITING_ON_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];
export const CATEGORY_FILTER_VALUES: SupportCategoryValue[] = [
  "ORDER_ISSUE",
  "PAYMENT",
  "RETURN_REFUND",
  "DELIVERY",
  "ACCOUNT_ACCESS",
  "CREATOR_PROGRAM",
  "BRAND_PARTNER",
  "REPORT_CONTENT",
  "FEEDBACK",
  "OTHER",
];
