import { fitProfileRepository } from "./fitProfile.repository.js";
import type { SaveFitProfileBody } from "./fitProfile.schemas.js";
import type { FitProfileView } from "./fitProfile.types.js";

export const fitProfileService = {
  async getMine(userId: string): Promise<FitProfileView | null> {
    return fitProfileRepository.findByUserId(userId);
  },

  async save(userId: string, measurements: SaveFitProfileBody): Promise<FitProfileView> {
    return fitProfileRepository.upsert(userId, measurements);
  },

  async remove(userId: string): Promise<void> {
    await fitProfileRepository.remove(userId);
  },
};
