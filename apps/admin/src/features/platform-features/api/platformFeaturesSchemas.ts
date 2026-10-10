import { z } from "zod";

export const featureDefinitionSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  registryDefault: z.boolean(),
  planDefaults: z.record(z.string(), z.boolean()),
});
export type FeatureDefinition = z.infer<typeof featureDefinitionSchema>;

export const resolvedFeatureSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  source: z.enum(["override", "plan", "default"]),
  metadata: z.record(z.string(), z.unknown()),
});
export type ResolvedFeature = z.infer<typeof resolvedFeatureSchema>;
