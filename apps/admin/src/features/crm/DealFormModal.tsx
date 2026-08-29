import { Button, FormBanner, Input, Modal, Select } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmPipelineApi } from "./pipelineApi";
import type { Deal, PipelineStage } from "./pipelineSchemas";
import { crmRelationshipsApi } from "./relationshipsApi";

const DEALS_QUERY_KEY = ["crm-deals"];
const PARTNER_OPTIONS_PAGE_SIZE = 100;

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
  const [partnerCreatorId, setPartnerCreatorId] = useState(deal?.partnerCreatorId ?? "");

  const { data: partnerPage } = useQuery({
    queryKey: ["crm-partner-options"],
    queryFn: () => crmRelationshipsApi.listPartners({ pageSize: PARTNER_OPTIONS_PAGE_SIZE }),
    enabled: open && !isEditing,
  });

  const save = useMutation({
    mutationFn: () =>
      isEditing
        ? crmPipelineApi.updateDeal(deal.id, { title, stageId, value })
        : crmPipelineApi.createDeal({ title, stageId, value, partnerCreatorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY });
      onClose();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  const canSubmit =
    title.trim().length > 0 && stageId !== "" && (isEditing || partnerCreatorId !== "");

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
            <Select
              id="deal-partner"
              value={partnerCreatorId}
              onChange={(event) => setPartnerCreatorId(event.target.value)}
              required
            >
              <option value="">Select a partner…</option>
              {(partnerPage?.items ?? []).map((partner) => (
                <option key={partner.creatorId} value={partner.creatorId}>
                  {partner.name} (@{partner.handle})
                </option>
              ))}
            </Select>
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
