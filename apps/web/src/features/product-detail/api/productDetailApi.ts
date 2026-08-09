import { apiClient } from "@/shared/lib/apiClient";
import { getSessionId } from "@/shared/lib/sessionId";
import { productDetailSchema, type ProductDetail } from "./productDetailSchemas";

export const productDetailApi = {
  async get(id: string): Promise<ProductDetail> {
    const res = await apiClient.get<ProductDetail>(`/products/${id}`);
    return productDetailSchema.parse(res.data);
  },

  // Fired when a shopper taps a "seen on creators" photo on this page itself — recorded as
  // PRODUCT_PAGE (browsing), not FEED (referral), so the creator isn't paid for traffic the
  // product already earned. See CreatorLookTagClickSource on the API.
  async recordSeenOnClick(lookId: string, productId: string): Promise<void> {
    await apiClient.post(`/creator-looks/${lookId}/tags/${productId}/click`, {
      sessionId: getSessionId(),
      source: "PRODUCT_PAGE",
    });
  },
};
