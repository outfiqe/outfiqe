const ORDER_REFERENCE_LENGTH = 8;

export const formatOrderReference = (orderId: string): string =>
  `#${orderId.slice(0, ORDER_REFERENCE_LENGTH).toUpperCase()}`;
