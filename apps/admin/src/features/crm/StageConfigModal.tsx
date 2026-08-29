import { Badge, Button, FormBanner, Input, Modal } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmPipelineApi } from "./pipelineApi";
import type { PipelineStage } from "./pipelineSchemas";

const STAGES_QUERY_KEY = ["crm-pipeline-stages"];

const swap = (ids: string[], from: number, to: number): string[] => {
  const next = [...ids];
  const moved = next[from];
  const displaced = next[to];
  if (moved === undefined || displaced === undefined) return ids;
  next[from] = displaced;
  next[to] = moved;
  return next;
};

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

  const stageIds = stages.map((stage) => stage.id);
  const anyError = addStage.error ?? removeStage.error ?? reorder.error;

  return (
    <Modal open={open} onClose={onClose} title="Configure pipeline stages">
      <div className="space-y-3">
        {anyError && <FormBanner>{getErrorMessage(anyError)}</FormBanner>}

        <ul className="space-y-2">
          {stages.map((stage, index) => (
            <li
              key={stage.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm"
            >
              <span className="flex items-center gap-2">
                {stage.name}
                {stage.isWon && <Badge tone="positive">won</Badge>}
                {stage.isLost && <Badge tone="negative">lost</Badge>}
              </span>
              <span className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => reorder.mutate(swap(stageIds, index, index - 1))}
                  aria-label={`Move ${stage.name} up`}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === stages.length - 1 || reorder.isPending}
                  onClick={() => reorder.mutate(swap(stageIds, index, index + 1))}
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
