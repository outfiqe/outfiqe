import { productSocialProofRepository } from "./social-proof.repository.js";

export const productSocialProofService = {
  async recountWornBy(productId: string): Promise<void> {
    const count = await productSocialProofRepository.countDistinctApprovedCreators(productId);
    await productSocialProofRepository.updateWornByCount(productId, count);
  },

  async recountWornByForCreator(creatorId: string): Promise<void> {
    const productIds = await productSocialProofRepository.listProductIdsTaggedByCreator(creatorId);
    await Promise.all(
      productIds.map((productId) => productSocialProofService.recountWornBy(productId)),
    );
  },

  async recomputeRatingSummary(productId: string): Promise<void> {
    await productSocialProofRepository.refreshRatingSummary(productId);
  },
};
