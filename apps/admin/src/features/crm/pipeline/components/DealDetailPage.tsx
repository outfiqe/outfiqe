import { Button, ConfirmModal, FormBanner } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { BackLink } from "@/components/BackLink";
import { MetricRow, MetricSection } from "@/components/MetricParts";
import { getErrorMessage } from "@/lib/errorMessages";

import { TimelineSection } from "../../activities/components/TimelineSection";
import { PlanGateBanner } from "../../billing/components/PlanGateBanner";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { RecordDetailSkeleton } from "../../components/CrmSkeletons";
import { CrmTermHint } from "../../components/CrmTermHint";
import { ConnectedPeopleSection } from "../../connections/components/ConnectedPeopleSection";
import { ConnectedWorkSection } from "../../connections/components/ConnectedWorkSection";
import { RECORD_SECTIONS_GRID_CLASS_NAME } from "../../constants/crmPageContent";
import { CRM_TERMS } from "../../constants/crmTerms";
import { useCrmPermissions } from "../../hooks/useCrmPermissions";
import { formatDate, formatRupees, toPlainWords } from "../../utils/format.utils";
import { crmPipelineApi } from "../api/pipelineApi";
import { DEALS_QUERY_KEY, STAGES_QUERY_KEY, toDealQueryKey } from "../constants/pipelineQueryKeys";
import { DealFormModal } from "./DealFormModal";

const routeApi = getRouteApi("/_authenticated/crm/pipeline/$dealId");

const DEALS_WRITE_PERMISSION = "deals:write";
const DEALS_DELETE_PERMISSION = "deals:delete";

export const DealDetailPage = () => {
  const { dealId } = routeApi.useParams();
  const navigate = useNavigate();
  const { organization, hasPermission } = useCrmPermissions();
  const canEditDeal = hasPermission(DEALS_WRITE_PERMISSION);
  const canDeleteDeal = hasPermission(DEALS_DELETE_PERMISSION);
  const dealSubject = { subjectType: "deal", subjectId: dealId } as const;

  const {
    data: deal,
    isLoading,
    error,
  } = useQuery({
    queryKey: toDealQueryKey(dealId),
    queryFn: () => crmPipelineApi.getDeal(dealId),
  });
  const { data: stages } = useQuery({
    queryKey: STAGES_QUERY_KEY,
    queryFn: crmPipelineApi.listStages,
    enabled: canEditDeal,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const removeDeal = useApiMutation({
    mutationFn: () => crmPipelineApi.deleteDeal(dealId),
    invalidateKeys: [DEALS_QUERY_KEY],
    successMessage: "Opportunity deleted.",
    errorMessage: getErrorMessage,
    onSuccess: () => navigate({ to: "/crm/pipeline" }),
    onError: () => setIsConfirmingDelete(false),
  });

  return (
    <div>
      {organization && (
        <PlanGateBanner advancedFeaturesEnabled={organization.advancedFeaturesEnabled} />
      )}
      <BackLink to="/crm/pipeline">Sales board</BackLink>

      {isLoading && <RecordDetailSkeleton />}
      {error && <FormBanner className="mt-4">{getErrorMessage(error)}</FormBanner>}

      {deal && (
        <div className="mt-4 space-y-6">
          <CrmPageHeader
            title={deal.title}
            description={`${deal.stageName} · ${formatRupees(deal.value)} · with ${deal.partnerName}`}
            actions={
              <>
                {canEditDeal && stages && (
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
                {canDeleteDeal && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setIsConfirmingDelete(true)}
                  >
                    Delete
                  </Button>
                )}
              </>
            }
          />

          <div className={RECORD_SECTIONS_GRID_CLASS_NAME}>
            <MetricSection
              title="About this opportunity"
              description="Where this sale stands and who is looking after it."
            >
              <MetricRow
                label={<CrmTermHint term="Stage" tip={CRM_TERMS.dealStage} />}
                value={deal.stageName}
              />
              <MetricRow
                label={<CrmTermHint term="Result so far" tip={CRM_TERMS.dealResult} />}
                value={toPlainWords(deal.status)}
              />
              <MetricRow label="Expected value" value={formatRupees(deal.value)} />
              <MetricRow
                label="Expected to close"
                value={deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "Not set"}
              />
              <MetricRow label="Looked after by" value={deal.ownerName ?? "Unassigned"} />
              <MetricRow label="Opened" value={formatDate(deal.createdAt)} />
              {deal.closedAt && <MetricRow label="Closed" value={formatDate(deal.closedAt)} />}
            </MetricSection>

            <ConnectedPeopleSection subject={dealSubject} />
          </div>

          <ConnectedWorkSection subject={dealSubject} />
          <TimelineSection {...dealSubject} />

          {stages && isEditing && (
            <DealFormModal
              open={isEditing}
              onClose={() => setIsEditing(false)}
              stages={stages}
              deal={deal}
            />
          )}
        </div>
      )}

      <ConfirmModal
        open={isConfirmingDelete}
        title="Delete this opportunity?"
        description={`${deal?.title ?? "This opportunity"} and its history will be removed for your whole team. This can't be undone.`}
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        destructive
        isPending={removeDeal.isPending}
        onConfirm={() => removeDeal.mutate()}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </div>
  );
};
