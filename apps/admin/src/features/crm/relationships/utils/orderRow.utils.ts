import { formatDate, toPlainWords } from "../../utils/format.utils";
import type { RelationshipOrder } from "../api/relationshipsSchemas";

const ORDER_ID_START = 0;
const SHORT_ORDER_ID_LENGTH = 8;
const SINGLE_ITEM_COUNT = 1;
const NO_OTHER_PRODUCTS = 0;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  COD: "Cash on delivery",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
};

export const toOrderReference = (orderId: string) =>
  `#${orderId.slice(ORDER_ID_START, SHORT_ORDER_ID_LENGTH).toUpperCase()}`;

export const toOrderHeadline = ({ lines }: Pick<RelationshipOrder, "lines">) => {
  const [firstLine, ...otherLines] = lines;
  return otherLines.length > NO_OTHER_PRODUCTS
    ? `${firstLine.productName} + ${otherLines.length} more`
    : firstLine.productName;
};

export const toOrderStatusLine = ({
  itemCount,
  paymentStatus,
  fulfilmentStatus,
  createdAt,
}: Pick<RelationshipOrder, "itemCount" | "paymentStatus" | "fulfilmentStatus" | "createdAt">) => {
  const itemCountLabel = `${itemCount} ${itemCount === SINGLE_ITEM_COUNT ? "item" : "items"}`;
  return `${itemCountLabel} · ${toPlainWords(paymentStatus)} · ${toPlainWords(fulfilmentStatus)} · ${formatDate(createdAt)}`;
};

export const toPaymentMethodLabel = (paymentMethod: string) =>
  PAYMENT_METHOD_LABELS[paymentMethod] ?? toPlainWords(paymentMethod);
