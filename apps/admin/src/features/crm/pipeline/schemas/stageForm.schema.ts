import { z } from "zod";

const STAGE_NAME_MAX_LENGTH = 60;

export const stageFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name for the stage.")
    .max(STAGE_NAME_MAX_LENGTH, `Use at most ${STAGE_NAME_MAX_LENGTH} characters.`),
});
export type StageFormValues = z.infer<typeof stageFormSchema>;
