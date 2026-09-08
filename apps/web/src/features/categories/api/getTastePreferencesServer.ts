import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { tastePreferenceSchema } from "./tastePreferencesApi";

export const getTastePreferencesServer = async (accessToken: string): Promise<string[] | null> => {
  try {
    const raw = await serverApiRequest<{ categorySlugs: string[] | null }>(
      "/taste-preferences/me",
      { accessToken },
    );
    return tastePreferenceSchema.parse(raw).categorySlugs;
  } catch {
    return null;
  }
};
