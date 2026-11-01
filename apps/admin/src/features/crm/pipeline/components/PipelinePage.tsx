import { KanbanBoard, KanbanBoardSkeleton } from "@outfiqe/components";
import { Button, FormBanner, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { SkeletonButton } from "@/components/SkeletonControls";
import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "../../api/crmApi";
import { PlanGateBanner } from "../../billing/components/PlanGateBanner";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { CRM_PAGE_TEXT } from "../../constants/crmPageContent";
import { formatRupees } from "../../utils/format.utils";
import { crmPipelineApi } from "../api/pipelineApi";
import { DEALS_QUERY_KEY, STAGES_QUERY_KEY, toDealQueryKey } from "../constants/pipelineQueryKeys";
import { DealFormModal } from "./DealFormModal";
import { StageConfigModal } from "./StageConfigModal";

const PIPELINE_CONFIGURE_PERMISSION = "pipeline:configure";
const DEALS_WRITE_PERMISSION = "deals:write";

export const PipelinePage = () => {
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
  const [stageModalOpen, setStageModalOpen] = useState(false);

  const moveDeal = useApiMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      crmPipelineApi.updateDeal(dealId, { stageId }),
    invalidateKeys: (_movedDeal, { dealId }) => [DEALS_QUERY_KEY, toDealQueryKey(dealId)],
    onError: (error) => toast.error(getErrorMessage(error)),
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
        <PlanGateBanner advancedFeaturesEnabled={organization.advancedFeaturesEnabled} />
      )}

      <CrmPageHeader
        {...CRM_PAGE_TEXT.pipeline}
        actions={
          <div className="flex gap-2">
            {canConfigure && (
              <Button size="sm" variant="outline" onClick={() => setStageModalOpen(true)}>
                Edit stages
              </Button>
            )}
            {canWriteDeals && stagesLoading && <SkeletonButton size="sm" label="New opportunity" />}
            {canWriteDeals && stages && stages.length > 0 && (
              <Button size="sm" onClick={() => setDealModalOpen(true)}>
                New opportunity
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-6">
        {stagesLoading && <KanbanBoardSkeleton />}
        {stagesError && <FormBanner>{getErrorMessage(stagesError)}</FormBanner>}

        {stages && stages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            This board has no stages yet. Add your stages to get started.
          </p>
        )}

        {stages && stages.length > 0 && (
          <KanbanBoard
            columns={columns}
            cards={cards}
            onCardMove={(dealId, stageId) => moveDeal.mutate({ dealId, stageId })}
            disabled={!canWriteDeals || moveDeal.isPending}
            emptyColumnLabel="No opportunities"
            renderCard={(card) => (
              <Link
                to="/crm/pipeline/$dealId"
                params={{ dealId: card.deal.id }}
                draggable={false}
                className="block w-full cursor-pointer text-left"
              >
                <span className="font-semibold text-foreground">{card.deal.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {card.deal.partnerName} · {formatRupees(card.deal.value)}
                </span>
              </Link>
            )}
          />
        )}
      </div>

      {stages && dealModalOpen && (
        <DealFormModal
          open={dealModalOpen}
          onClose={() => setDealModalOpen(false)}
          stages={stages}
          deal={null}
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
