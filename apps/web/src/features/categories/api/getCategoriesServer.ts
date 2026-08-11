import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";
import { categoryListSchema, type PublicCategory } from "./categorySchemas";

export const getCategoriesServer = async (): Promise<PublicCategory[]> => {
  try {
    const raw = await serverApiRequest<PublicCategory[]>("/categories");
    return categoryListSchema.parse(raw);
  } catch {
    return [];
  }
};
