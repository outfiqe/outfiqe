import { z } from "zod";

export const responsiveImageSourceSchema = z.object({
  format: z.enum(["avif", "webp", "jpeg"]),
  srcSet: z.string(),
});

export const responsiveImageSchema = z.object({
  url: z.string(),
  lqip: z.string().nullable(),
  sources: z.array(responsiveImageSourceSchema),
});

export type ResponsiveImageSource = z.infer<typeof responsiveImageSourceSchema>;
export type ResponsiveImage = z.infer<typeof responsiveImageSchema>;
