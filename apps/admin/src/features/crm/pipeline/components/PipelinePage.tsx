import { KanbanBoard, KanbanBoardSkeleton } from "@outfiqe/components";
import { Button, FilterChip, FormBanner, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { SkeletonButton } from "@/components/SkeletonControls";
import { getErrorMessage } from "@/lib/errorMessages";
import { rawTextFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { crmApi } from "../../api/crmApi";
import { PlanGateBanner } from "../../billing/components/PlanGateBanner";
import { CrmMemberFilter } from "../../components/CrmMemberFilter";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { CsvExportButton } from "../../components/CsvExportButton";
import { CRM_PAGE_TEXT } from "../../constants/crmPageContent";
import { useCrmCsvExport } from "../../hooks/useCrmCsvExport";
import { useNewRecordModal } from "../../hooks/useNewRecordModal";
import { formatRupees } from "../../utils/format.utils";
import { crmPipelineApi } from "../api/pipelineApi";
import { DEALS_QUERY_KEY, STAGES_QUERY_KEY, toDealQueryKey } from "../constants/pipelineQueryKeys";
import { STUCK_DEAL_DAYS, STUCK_FILTER_VALUE, toStuckBefore } from "../constants/stuckDeals";
import { toDaysInStageLabel } from "../utils/dealCard.utils";
import { DealFormModal } from "./DealFormModal";
import { StageConfigModal } from "./StageConfigModal";

const PIPELINE_CONFIGURE_PERMISSION = "pipeline:configure";
const DEALS_WRITE_PERMISSION = "deals:write";
const EXPORT_FILE_NAME = "opportunities.csv";
const EXPORT_FAILURE_MESSAGE = "Couldn't export your opportunities. Try filtering by owner.";

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
  const [ownerFilter, setOwnerFilter] = useSearchFilter("owner", rawTextFilter);
  const [stuckFilter, setStuckFilter] = useSearchFilter("stuck", rawTextFilter);
  const isShowingStuckDeals = stuckFilter === STUCK_FILTER_VALUE;
  const toDealFilters = () => ({
    ownerMembershipId: ownerFilter || undefined,
    stageEnteredBefore: isShowingStuckDeals ? toStuckBefore() : undefined,
  });
  const { data: deals } = useQuery({
    queryKey: [...DEALS_QUERY_KEY, ownerFilter, isShowingStuckDeals],
    queryFn: () => crmPipelineApi.listDeals(toDealFilters()),
  });
  const { exportCsv, isExporting } = useCrmCsvExport(
    () => crmPipelineApi.exportDeals(toDealFilters()),
    EXPORT_FILE_NAME,
    EXPORT_FAILURE_MESSAGE,
  );

  const { isNewRecordModalOpen, openNewRecordModal, closeNewRecordModal } = useNewRecordModal();
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
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              isSelected={isShowingStuckDeals}
              onClick={() => setStuckFilter(isShowingStuckDeals ? "" : STUCK_FILTER_VALUE)}
            >
              Stuck for {STUCK_DEAL_DAYS}+ days
            </FilterChip>
            <CrmMemberFilter
              label="Filter by owner"
              allLabel="All owners"
              value={ownerFilter}
              onChange={setOwnerFilter}
            />
            <CsvExportButton isExporting={isExporting} onExport={() => void exportCsv()} />
            {canConfigure && (
              <Button size="sm" variant="outline" onClick={() => setStageModalOpen(true)}>
                Edit stages
              </Button>
            )}
            {canWriteDeals && stagesLoading && <SkeletonButton size="sm" label="New opportunity" />}
            {canWriteDeals && stages && stages.length > 0 && (
              <Button size="sm" onClick={openNewRecordModal}>
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
                <span className="mt-1 block text-sm font-medium text-foreground">
                  {formatRupees(card.deal.value)}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  with {card.deal.partnerName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {card.deal.ownerName ?? "Unassigned"}
                  {toDaysInStageLabel(card.deal) && ` · ${toDaysInStageLabel(card.deal)}`}
                </span>
              </Link>
            )}
          />
        )}
      </div>

      {stages && isNewRecordModalOpen && (
        <DealFormModal open onClose={closeNewRecordModal} stages={stages} deal={null} />
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
