import { Button, FormBanner, Modal } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { gamificationApi } from "../api";
import type { ActivityXpConfig } from "../schemas";
import { ActivityConfigFields } from "./ActivityConfigFields";
import { ACTIVITY_CONFIG_QUERY_KEY } from "./activityConfigForm.constants";
import type { ActivityConfigFormState } from "./activityConfigForm.types";
import { formForActivityConfig, toUpdateActivityConfigInput } from "./activityConfigForm.utils";

export const EditActivityConfigModal = ({
  config,
  onClose,
}: {
  config: ActivityXpConfig;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ActivityConfigFormState>(() => formForActivityConfig(config));
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: () =>
      gamificationApi.updateActivityConfig(config.activityType, toUpdateActivityConfigInput(form)),
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
        <ActivityConfigFields idPrefix="activity-config" form={form} onChange={setForm} />
        {error && <FormBanner>{error}</FormBanner>}
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Modal>
  );
};
