import type { UpdateActivityXpConfigInput } from "../api";
import type { ActivityXpConfig } from "../schemas";
import type { ActivityConfigFormState } from "./activityConfigForm.types";

export const formForActivityConfig = (config: ActivityXpConfig): ActivityConfigFormState => ({
  enabled: config.enabled,
  xpAmount: String(config.xpAmount),
  dailyLimit: config.dailyLimit === null ? "" : String(config.dailyLimit),
  cooldownSeconds: config.cooldownSeconds === null ? "" : String(config.cooldownSeconds),
  maxPerEntity: config.maxPerEntity === null ? "" : String(config.maxPerEntity),
});

export const toUpdateActivityConfigInput = (
  form: ActivityConfigFormState,
): UpdateActivityXpConfigInput => ({
  enabled: form.enabled,
  xpAmount: Number(form.xpAmount),
  dailyLimit: form.dailyLimit ? Number(form.dailyLimit) : null,
  cooldownSeconds: form.cooldownSeconds ? Number(form.cooldownSeconds) : null,
  maxPerEntity: form.maxPerEntity ? Number(form.maxPerEntity) : null,
});
