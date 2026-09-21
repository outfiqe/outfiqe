import { z } from "zod";

const TITLE_MAX_LENGTH = 200;

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title for the task.")
    .max(TITLE_MAX_LENGTH, `Use at most ${TITLE_MAX_LENGTH} characters.`),
  assigneeMembershipId: z.string().min(1, "Choose who this task is for."),
  dueAt: z.string(),
});
export type TaskFormValues = z.infer<typeof taskFormSchema>;
