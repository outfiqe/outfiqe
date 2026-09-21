import { z } from "zod";

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 8000;

export const ticketFormSchema = z.object({
  type: z.enum(["COMPLAINT", "REQUEST"]),
  title: z
    .string()
    .trim()
    .min(1, "Enter a title for the ticket.")
    .max(TITLE_MAX_LENGTH, `Use at most ${TITLE_MAX_LENGTH} characters.`),
  description: z
    .string()
    .trim()
    .min(1, "Describe the problem or request.")
    .max(DESCRIPTION_MAX_LENGTH, `Use at most ${DESCRIPTION_MAX_LENGTH} characters.`),
  customerUserId: z.string().min(1, "Choose the customer this ticket is about."),
});
export type TicketFormValues = z.infer<typeof ticketFormSchema>;
