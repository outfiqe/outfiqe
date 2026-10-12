import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, FormBanner, Modal } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useForm } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";

import { gamificationApi } from "../../api/gamificationApi";
import type { ActivityXpConfig } from "../../api/gamificationSchemas";
import { ACTIVITY_CONFIG_QUERY_KEY } from "../constants/activityConfigForm.constants";
import { activityConfigFormSchema } from "../schemas/activityConfigForm.schema";
import type { ActivityConfigFormState } from "../types/activityConfigForm.types";
import {
  formForActivityConfig,
  toUpdateActivityConfigInput,
} from "../utils/activityConfigForm.utils";
import { ActivityConfigFields } from "./ActivityConfigFields";

export const EditActivityConfigModal = ({
  config,
  onClose,
}: {
  config: ActivityXpConfig;
  onClose: () => void;
}) => {
  const form = useForm<ActivityConfigFormState>({
    resolver: zodResolver(activityConfigFormSchema),
    defaultValues: formForActivityConfig(config),
    mode: "onTouched",
  });

  const update = useApiMutation({
    mutationFn: (values: ActivityConfigFormState) =>
      gamificationApi.updateActivityConfig(
        config.activityType,
        toUpdateActivityConfigInput(values),
      ),
    invalidateKeys: [ACTIVITY_CONFIG_QUERY_KEY],
    successMessage: "Activity XP settings saved.",
    onSuccess: () => onClose(),
  });

  const submitActivityConfig = form.handleSubmit((values) => update.mutate(values));

  return (
    <Modal open onClose={onClose} title={`Edit ${config.activityType}`}>
      <Form {...form}>
        <form onSubmit={submitActivityConfig} noValidate className="space-y-4">
          <ActivityConfigFields form={form} />
          {update.isError && <FormBanner>{getErrorMessage(update.error)}</FormBanner>}
          <Button type="submit" isLoading={update.isPending}>
            Save changes
          </Button>
        </form>
      </Form>
    </Modal>
  );
};
