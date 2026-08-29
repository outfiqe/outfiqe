import { KanbanBoard } from "@outfiqe/components";
import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import { CrmTabs } from "./CrmTabs";
import { DealFormModal } from "./DealFormModal";
import { crmPipelineApi } from "./pipelineApi";
import type { Deal } from "./pipelineSchemas";
import { PlanGateBanner } from "./PlanGateBanner";
import { StageConfigModal } from "./StageConfigModal";

const STAGES_QUERY_KEY = ["crm-pipeline-stages"];
const DEALS_QUERY_KEY = ["crm-deals"];
const PIPELINE_CONFIGURE_PERMISSION = "pipeline:configure";
const DEALS_WRITE_PERMISSION = "deals:write";

const formatRupees = (amount: number) => `Rs. ${amount.toLocaleString()}`;

export const PipelinePage = () => {
  const queryClient = useQueryClient();
  const { data: organization } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
  });

  const {
    data: stages,
    isLoading: stagesLoading,
    error: stagesError,
  } = useQuery({ queryKey: STAGES_QUERY_KEY, queryFn: crmPipelineApi.listStages });
  const { data: deals } = useQuery({
    queryKey: DEALS_QUERY_KEY,
    queryFn: crmPipelineApi.listDeals,
  });

  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [stageModalOpen, setStageModalOpen] = useState(false);

  const moveDeal = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      crmPipelineApi.updateDeal(dealId, { stageId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEALS_QUERY_KEY }),
  });

  const canConfigure =
    organization?.viewerIsSuperAdmin ||
    organization?.viewerPermissionKeys.includes(PIPELINE_CONFIGURE_PERMISSION);
  const canWriteDeals =
    organization?.viewerIsSuperAdmin ||
    organization?.viewerPermissionKeys.includes(DEALS_WRITE_PERMISSION);

  const columns = (stages ?? []).map((stage) => ({
    id: stage.id,
    title: stage.name,
    accentClassName: stage.isWon
      ? "text-primary-strong"
      : stage.isLost
        ? "text-destructive"
        : "text-foreground",
  }));
  const cards = (deals ?? []).map((deal) => ({ id: deal.id, columnId: deal.stageId, deal }));

  return (
    <div>
      {organization && (
        <>
          <CrmTabs
            viewerIsSuperAdmin={organization.viewerIsSuperAdmin}
            viewerPermissionKeys={organization.viewerPermissionKeys}
          />
          <PlanGateBanner advancedFeaturesEnabled={organization.advancedFeaturesEnabled} />
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-foreground">Pipeline</h1>
        <div className="flex gap-2">
          {canConfigure && (
            <Button size="sm" variant="outline" onClick={() => setStageModalOpen(true)}>
              Configure stages
            </Button>
          )}
          {canWriteDeals && stages && stages.length > 0 && (
            <Button
              size="sm"
              onClick={() => {
                setEditingDeal(null);
                setDealModalOpen(true);
              }}
            >
              New deal
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {stagesLoading && <Skeleton className="h-64 w-full" />}
        {stagesError && <FormBanner>{getErrorMessage(stagesError)}</FormBanner>}

        {stages && stages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            This pipeline has no stages yet. Configure stages to get started.
          </p>
        )}

        {stages && stages.length > 0 && (
          <KanbanBoard
            columns={columns}
            cards={cards}
            onCardMove={(dealId, stageId) => moveDeal.mutate({ dealId, stageId })}
            emptyColumnLabel="No deals"
            renderCard={(card) => (
              <button
                type="button"
                className="w-full cursor-pointer text-left"
                onClick={() => {
                  setEditingDeal(card.deal);
                  setDealModalOpen(true);
                }}
              >
                <span className="font-semibold text-foreground">{card.deal.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {card.deal.partnerName} · {formatRupees(card.deal.value)}
                </span>
              </button>
            )}
          />
        )}
      </div>

      {stages && dealModalOpen && (
        <DealFormModal
          open={dealModalOpen}
          onClose={() => setDealModalOpen(false)}
          stages={stages}
          deal={editingDeal}
        />
      )}

      {stages && stageModalOpen && (
        <StageConfigModal
          open={stageModalOpen}
          onClose={() => setStageModalOpen(false)}
          stages={stages}
        />
      )}
    </div>
  );
};
