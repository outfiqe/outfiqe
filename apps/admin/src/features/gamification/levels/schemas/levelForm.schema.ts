import { z } from "zod";

import { wholeNumberText } from "@/lib/formFields";

const LEVEL_NAME_MAX_LENGTH = 100;
const LEVEL_ICON_MAX_LENGTH = 8;
const MAX_LEVEL_NUMBER = 1_000;
const MAX_REQUIRED_XP = 2_000_000_000;
const FIRST_LEVEL_NUMBER = 1;

export const levelFormSchema = z.object({
  level: wholeNumberText("a level number", { max: MAX_LEVEL_NUMBER }).refine(
    (raw) => raw === "" || Number(raw) >= FIRST_LEVEL_NUMBER,
    { message: `Level numbers start at ${FIRST_LEVEL_NUMBER}.` },
  ),
  name: z
    .string()
    .trim()
    .min(1, "Enter a name for the level.")
    .max(LEVEL_NAME_MAX_LENGTH, `Use at most ${LEVEL_NAME_MAX_LENGTH} characters.`),
  requiredXp: wholeNumberText("the required XP", { max: MAX_REQUIRED_XP }),
  icon: z
    .string()
    .trim()
    .max(LEVEL_ICON_MAX_LENGTH, `Use at most ${LEVEL_ICON_MAX_LENGTH} characters.`),
});
export type LevelFormValues = z.infer<typeof levelFormSchema>;

export const EMPTY_LEVEL_FORM: LevelFormValues = { level: "", name: "", requiredXp: "", icon: "" };
