import { Badge, Button, cn, FormBanner, Input, Modal } from "@outfiqe/design-system";
import { useDragReorder } from "@outfiqe/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmPipelineApi } from "./pipelineApi";
import type { PipelineStage } from "./pipelineSchemas";

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
  const queryClient = useQueryClient();
  const [newStageName, setNewStageName] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY });

  const addStage = useMutation({
    mutationFn: () => crmPipelineApi.createStage({ name: newStageName.trim() }),
    onSuccess: () => {
      setNewStageName("");
      invalidate();
    },
  });
  const removeStage = useMutation({
    mutationFn: (stageId: string) => crmPipelineApi.deleteStage(stageId),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: (orderedStageIds: string[]) => crmPipelineApi.reorderStages(orderedStageIds),
    onSuccess: invalidate,
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

        <div className="flex gap-2">
          <Input
            value={newStageName}
            onChange={(event) => setNewStageName(event.target.value)}
            placeholder="New stage name"
          />
          <Button
            disabled={newStageName.trim().length === 0 || addStage.isPending}
            onClick={() => addStage.mutate()}
          >
            Add
          </Button>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
