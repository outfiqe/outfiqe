import { Avatar, FormBanner, StatCard } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { BackLink } from "@/components/BackLink";
import { MetricEmptyState, MetricRow, MetricSection } from "@/components/MetricParts";
import { getErrorMessage } from "@/lib/errorMessages";

import { TimelineSection } from "../../activities/components/TimelineSection";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { PartnerDetailSkeleton } from "../../components/CrmSkeletons";
import { ConnectedPeopleSection } from "../../connections/components/ConnectedPeopleSection";
import { ConnectedWorkSection } from "../../connections/components/ConnectedWorkSection";
import { RECORD_SECTIONS_GRID_CLASS_NAME } from "../../constants/crmPageContent";
import { CRM_TERMS } from "../../constants/crmTerms";
import { formatDate, formatRupees, toPlainWords } from "../../utils/format.utils";
import { crmRelationshipsApi } from "../api/relationshipsApi";
import { PartnerProductsSection } from "./PartnerProductsSection";

const routeApi = getRouteApi("/_authenticated/crm/partners/$creatorId");

export const PartnerDetailPage = () => {
  const { creatorId } = routeApi.useParams();
  const partnerSubject = { subjectType: "partner", subjectId: creatorId } as const;
  const {
    data: partner,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-partner", creatorId],
    queryFn: () => crmRelationshipsApi.getPartner(creatorId),
  });

  return (
    <div>
      <BackLink to="/crm/partners">All partners</BackLink>

      {isLoading && <PartnerDetailSkeleton />}
      {error && <FormBanner className="mt-4">{getErrorMessage(error)}</FormBanner>}

      {partner && (
        <div className="mt-4 space-y-6">
          <CrmPageHeader
            title={partner.name}
            leading={<Avatar name={partner.name} imageUrl={partner.avatarUrl} size="lg" />}
            description={
              partner.lastActivityAt
                ? `@${partner.handle} · last active ${formatDate(partner.lastActivityAt)}`
                : `@${partner.handle} · no activity yet`
            }
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Tag clicks"
              value={partner.tagClickCount.toLocaleString()}
              hint={CRM_TERMS.tagClicks}
            />
            <StatCard
              label="Orders they brought"
              value={partner.attributedOrderCount.toLocaleString()}
              hint={CRM_TERMS.ordersBrought}
            />
            <StatCard label="Sales they brought" value={formatRupees(partner.attributedRevenue)} />
          </div>

          <div className={RECORD_SECTIONS_GRID_CLASS_NAME}>
            <PartnerProductsSection products={partner.productBreakdown} />

            <MetricSection
              title="Recent orders they brought"
              description="The latest orders that came through this partner."
            >
              {partner.recentAttributedOrders.length === 0 ? (
                <MetricEmptyState>No orders from this partner yet.</MetricEmptyState>
              ) : (
                partner.recentAttributedOrders.map((order) => (
                  <MetricRow
                    key={order.orderItemId}
                    label={`${order.productName} × ${order.qty}`}
                    detail={`${toPlainWords(order.paymentStatus)} · ${toPlainWords(order.fulfilmentStatus)} · ${formatDate(order.createdAt)}`}
                    value={formatRupees(order.unitPrice * order.qty)}
                  />
                ))
              )}
            </MetricSection>
          </div>

          <ConnectedPeopleSection subject={partnerSubject} />
          <ConnectedWorkSection subject={partnerSubject} />
          <TimelineSection {...partnerSubject} />
        </div>
      )}
    </div>
  );
};
