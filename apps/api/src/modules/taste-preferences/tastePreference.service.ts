import { tastePreferenceRepository } from "./tastePreference.repository.js";
import type { CategoryPopularity, TastePreferenceView } from "./tastePreference.types.js";

const dedupe = (slugs: string[]): string[] => [...new Set(slugs)];

export const tastePreferenceService = {
  async getForUser(userId: string): Promise<TastePreferenceView> {
    return { categorySlugs: await tastePreferenceRepository.findForUser(userId) };
  },

  async setForUser(userId: string, categorySlugs: string[]): Promise<void> {
    if (categorySlugs.length === 0) {
      await tastePreferenceRepository.deleteForUser(userId);
      return;
    }
    await tastePreferenceRepository.upsertForUser(userId, dedupe(categorySlugs));
  },

  async clearForUser(userId: string): Promise<void> {
    await tastePreferenceRepository.deleteForUser(userId);
  },

  async listCategoryPopularity(): Promise<CategoryPopularity[]> {
    return tastePreferenceRepository.listCategoryPopularity();
  },
};
