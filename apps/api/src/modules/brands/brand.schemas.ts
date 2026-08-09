import { z } from "zod";

export const brandIdParamSchema = z.object({ id: z.uuid() });

export type BrandIdParam = z.infer<typeof brandIdParamSchema>;
