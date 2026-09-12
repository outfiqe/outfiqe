import { Button, FormBanner, Input, Modal, Select } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { PartnerSearchField, type SelectedPartner } from "./PartnerSearchField";
import { crmPipelineApi } from "./pipelineApi";
import type { Deal, PipelineStage } from "./pipelineSchemas";

const DEALS_QUERY_KEY = ["crm-deals"];

type DealFormModalProps = {
  open: boolean;
  onClose: () => void;
  stages: PipelineStage[];
  deal: Deal | null;
};

export const DealFormModal = ({ open, onClose, stages, deal }: DealFormModalProps) => {
  const queryClient = useQueryClient();
  const isEditing = deal !== null;

  const [title, setTitle] = useState(deal?.title ?? "");
  const [stageId, setStageId] = useState(deal?.stageId ?? stages[0]?.id ?? "");
  const [value, setValue] = useState(deal?.value ?? 0);
  const [partner, setPartner] = useState<SelectedPartner | null>(null);

  const save = useMutation({
    mutationFn: () =>
      isEditing
        ? crmPipelineApi.updateDeal(deal.id, { title, stageId, value })
        : crmPipelineApi.createDeal({
            title,
            stageId,
            value,
            partnerCreatorId: partner?.creatorId ?? "",
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY });
      onClose();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  const canSubmit = title.trim().length > 0 && stageId !== "" && (isEditing || partner !== null);

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit deal" : "New deal"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="deal-title" className="text-xs text-muted-foreground">
            Title
          </label>
          <Input
            id="deal-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="deal-stage" className="text-xs text-muted-foreground">
            Stage
          </label>
          <Select
            id="deal-stage"
            value={stageId}
            onChange={(event) => setStageId(event.target.value)}
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="deal-value" className="text-xs text-muted-foreground">
            Value (Rs.)
          </label>
          <Input
            id="deal-value"
            type="number"
            min={0}
            value={value}
            onChange={(event) => setValue(Number(event.target.value))}
          />
        </div>

        {!isEditing && (
          <div className="space-y-1.5">
            <label htmlFor="deal-partner" className="text-xs text-muted-foreground">
              Partner
            </label>
            <PartnerSearchField id="deal-partner" value={partner} onChange={setPartner} />
          </div>
        )}

        {save.isError && <FormBanner>{getErrorMessage(save.error)}</FormBanner>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || save.isPending}>
            {save.isPending ? "Saving…" : isEditing ? "Save deal" : "Create deal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
