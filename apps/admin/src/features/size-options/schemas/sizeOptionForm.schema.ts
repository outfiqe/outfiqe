import { z } from "zod";

const LABEL_MAX_LENGTH = 20;

export const sizeOptionFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Enter a size label, such as M or XL.")
    .max(LABEL_MAX_LENGTH, `Use at most ${LABEL_MAX_LENGTH} characters.`),
});
export type SizeOptionFormValues = z.infer<typeof sizeOptionFormSchema>;

export const EMPTY_SIZE_OPTION_FORM: SizeOptionFormValues = { label: "" };
