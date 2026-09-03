import { z } from "zod";

const SLUG_MAX_LENGTH = 80;
const MAX_SELECTED_CATEGORIES = 50;

export const setTastePreferenceSchema = z.object({
  categorySlugs: z
    .array(z.string().trim().min(1).max(SLUG_MAX_LENGTH))
    .max(MAX_SELECTED_CATEGORIES),
});

export type SetTastePreferenceBody = z.infer<typeof setTastePreferenceSchema>;
