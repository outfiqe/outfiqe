import { resolveLiveBoardRole } from "./outfit.access.js";
import { OUTFIT_LIMITS, OUTFIT_VIEWER_ROLE } from "./outfit.constants.js";
import { outfitErrors } from "./outfit.errors.js";
import { outfitRepository } from "./outfit.repository.js";
import type { OutfitProductView } from "./outfit.types.js";
import { toProductView } from "./outfit.utils.js";
import { outfitStockRepository } from "./outfit-stock.repository.js";

export const outfitReplacementService = {
  async listReplacements(
    viewerId: string,
    { outfitId, slotKey, position }: { outfitId: string; slotKey: string; position: number },
  ): Promise<{ products: OutfitProductView[] }> {
    const liveBoardRole = await resolveLiveBoardRole(outfitId, viewerId);
    if (liveBoardRole === null || liveBoardRole === OUTFIT_VIEWER_ROLE.VIEWER) {
      throw outfitErrors.notFound();
    }

    const currentProduct = await outfitStockRepository.findItemProductAt(
      outfitId,
      slotKey,
      position,
    );
    if (!currentProduct) throw outfitErrors.itemNotFound();

    const replacementIds = await outfitStockRepository.listReplacementProductIds(
      outfitId,
      currentProduct,
      OUTFIT_LIMITS.REPLACEMENT_SUGGESTIONS_MAX,
    );
    const replacementById = new Map(
      (await outfitRepository.findBoardProducts(replacementIds)).map((product) => [
        product.id,
        product,
      ]),
    );
    return {
      products: replacementIds.flatMap((productId) => {
        const replacement = replacementById.get(productId);
        return replacement ? [toProductView(replacement)] : [];
      }),
    };
  },
};
