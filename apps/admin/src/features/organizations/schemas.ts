import { z } from "zod";

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  plan: z.string(),
  createdAt: z.string(),
});
export type Organization = z.infer<typeof organizationSchema>;
