import { Button, Checkbox, FormBanner, Input, Modal } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { gamificationApi, type UpdateActivityXpConfigInput } from "./api";
import type { ActivityXpConfig } from "./schemas";

const ACTIVITY_CONFIG_QUERY_KEY = ["admin-activity-config"];

type ConfigFormState = {
  enabled: boolean;
  xpAmount: string;
  dailyLimit: string;
  cooldownSeconds: string;
  maxPerEntity: string;
};

const formForConfig = (config: ActivityXpConfig): ConfigFormState => ({
  enabled: config.enabled,
  xpAmount: String(config.xpAmount),
  dailyLimit: config.dailyLimit === null ? "" : String(config.dailyLimit),
  cooldownSeconds: config.cooldownSeconds === null ? "" : String(config.cooldownSeconds),
  maxPerEntity: config.maxPerEntity === null ? "" : String(config.maxPerEntity),
});

const toUpdateInput = (form: ConfigFormState): UpdateActivityXpConfigInput => ({
  enabled: form.enabled,
  xpAmount: Number(form.xpAmount),
  dailyLimit: form.dailyLimit ? Number(form.dailyLimit) : null,
  cooldownSeconds: form.cooldownSeconds ? Number(form.cooldownSeconds) : null,
  maxPerEntity: form.maxPerEntity ? Number(form.maxPerEntity) : null,
});

const EditActivityConfigModal = ({
  config,
  onClose,
}: {
  config: ActivityXpConfig;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ConfigFormState>(() => formForConfig(config));
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: () =>
      gamificationApi.updateActivityConfig(config.activityType, toUpdateInput(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVITY_CONFIG_QUERY_KEY });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate();
  };

  return (
    <Modal open onClose={onClose} title={`Edit ${config.activityType}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          Enabled
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="activity-config-xp-amount"
              className="block text-xs text-muted-foreground"
            >
              XP amount
            </label>
            <Input
              id="activity-config-xp-amount"
              type="number"
              required
              min={0}
              value={form.xpAmount}
              onChange={(e) => setForm({ ...form, xpAmount: e.target.value })}
              className="w-28"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="activity-config-daily-limit"
              className="block text-xs text-muted-foreground"
            >
              Daily limit
            </label>
            <Input
              id="activity-config-daily-limit"
              type="number"
              min={1}
              placeholder="No limit"
              value={form.dailyLimit}
              onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })}
              className="w-28"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="activity-config-cooldown"
              className="block text-xs text-muted-foreground"
            >
              Cooldown (sec)
            </label>
            <Input
              id="activity-config-cooldown"
              type="number"
              min={1}
              placeholder="None"
              value={form.cooldownSeconds}
              onChange={(e) => setForm({ ...form, cooldownSeconds: e.target.value })}
              className="w-28"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="activity-config-max-per-entity"
              className="block text-xs text-muted-foreground"
            >
              Max per entity
            </label>
            <Input
              id="activity-config-max-per-entity"
              type="number"
              min={1}
              placeholder="No cap"
              value={form.maxPerEntity}
              onChange={(e) => setForm({ ...form, maxPerEntity: e.target.value })}
              className="w-28"
            />
          </div>
        </div>

        {error && <FormBanner>{error}</FormBanner>}
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Modal>
  );
};

export const ActivityConfigSection = () => {
  const { data: configs, isLoading } = useQuery({
    queryKey: ACTIVITY_CONFIG_QUERY_KEY,
    queryFn: gamificationApi.listActivityConfigs,
  });
  const [editingConfig, setEditingConfig] = useState<ActivityXpConfig | null>(null);

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Activity XP</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        How much XP each platform activity awards, and the anti-abuse limits on it.
      </p>

      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {configs?.map((config) => (
          <div
            key={config.activityType}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {config.activityType}
                {!config.enabled && (
                  <span className="ml-2 text-xs text-muted-foreground">(disabled)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {config.xpAmount} XP
                {config.dailyLimit !== null && ` · daily cap ${config.dailyLimit}`}
                {config.cooldownSeconds !== null && ` · ${config.cooldownSeconds}s cooldown`}
                {config.maxPerEntity !== null && ` · max ${config.maxPerEntity}/entity`}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditingConfig(config)}>
              Edit
            </Button>
          </div>
        ))}
      </div>

      {editingConfig && (
        <EditActivityConfigModal
          key={editingConfig.activityType}
          config={editingConfig}
          onClose={() => setEditingConfig(null)}
        />
      )}
    </div>
  );
};
