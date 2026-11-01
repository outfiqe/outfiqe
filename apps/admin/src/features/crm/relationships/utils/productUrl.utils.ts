const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";

export const toPublicProductUrl = (productId: string) => `${WEB_URL}/product/${productId}`;
