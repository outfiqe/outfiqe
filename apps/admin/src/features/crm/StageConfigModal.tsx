import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  cn,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Modal,
} from "@outfiqe/design-system";
import { useApiMutation, useDragReorder } from "@outfiqe/hooks";
import { GripVertical } from "lucide-react";
import { useForm } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmPipelineApi } from "./pipelineApi";
import type { PipelineStage } from "./pipelineSchemas";
import { stageFormSchema, type StageFormValues } from "./stageForm.schema";

const STAGES_QUERY_KEY = ["crm-pipeline-stages"];

export const StageConfigModal = ({
  open,
  onClose,
  stages,
}: {
  open: boolean;
  onClose: () => void;
  stages: PipelineStage[];
}) => {
  const form = useForm<StageFormValues>({
    resolver: zodResolver(stageFormSchema),
    defaultValues: { name: "" },
    mode: "onTouched",
  });

  const addStage = useApiMutation({
    mutationFn: (values: StageFormValues) =>
      crmPipelineApi.createStage({ name: values.name.trim() }),
    invalidateKeys: [STAGES_QUERY_KEY],
    successMessage: "Stage added.",
    onSuccess: () => form.reset({ name: "" }),
  });
  const removeStage = useApiMutation({
    mutationFn: (stageId: string) => crmPipelineApi.deleteStage(stageId),
    invalidateKeys: [STAGES_QUERY_KEY],
    successMessage: "Stage deleted.",
  });

  const submitStage = form.handleSubmit((values) => addStage.mutate(values));
  const reorder = useApiMutation({
    mutationFn: (orderedStageIds: string[]) => crmPipelineApi.reorderStages(orderedStageIds),
    invalidateKeys: [STAGES_QUERY_KEY],
  });

  const { getDragProps, moveEntry, draggingId, dragOverId } = useDragReorder({
    order: stages,
    getId: (stage) => stage.id,
    onReorder: (nextOrder) => reorder.mutate(nextOrder.map((stage) => stage.id)),
  });

  const anyError = addStage.error ?? removeStage.error ?? reorder.error;

  return (
    <Modal open={open} onClose={onClose} title="Configure pipeline stages">
      <div className="space-y-3">
        {anyError && <FormBanner>{getErrorMessage(anyError)}</FormBanner>}

        <ul className="space-y-2">
          {stages.map((stage, index) => (
            <li
              key={stage.id}
              {...getDragProps(stage.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm transition-colors",
                draggingId === stage.id && "opacity-50",
                dragOverId === stage.id && "border-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="cursor-grab text-muted-foreground active:cursor-grabbing"
                >
                  <GripVertical className="size-4" />
                </span>
                {stage.name}
                {stage.isWon && <Badge tone="positive">won</Badge>}
                {stage.isLost && <Badge tone="negative">lost</Badge>}
              </span>
              <span className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => moveEntry(index, index - 1)}
                  aria-label={`Move ${stage.name} up`}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === stages.length - 1 || reorder.isPending}
                  onClick={() => moveEntry(index, index + 1)}
                  aria-label={`Move ${stage.name} down`}
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={removeStage.isPending}
                  onClick={() => removeStage.mutate(stage.id)}
                  aria-label={`Delete ${stage.name}`}
                >
                  ✕
                </Button>
              </span>
            </li>
          ))}
        </ul>

        <Form {...form}>
          <form onSubmit={submitStage} noValidate className="flex items-start gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="mt-0 flex-1 space-y-1.5">
                  <FormControl>
                    <Input placeholder="New stage name" aria-label="New stage name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" isLoading={addStage.isPending}>
              Add
            </Button>
          </form>
        </Form>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
