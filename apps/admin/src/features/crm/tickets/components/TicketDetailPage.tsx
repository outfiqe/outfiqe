import { Badge, FormBanner } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { BackLink } from "@/components/BackLink";
import { MetricRow, MetricSection } from "@/components/MetricParts";
import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "../../api/crmApi";
import { PlanGateBanner } from "../../billing/components/PlanGateBanner";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { RecordDetailSkeleton } from "../../components/CrmSkeletons";
import { ConnectedPeopleSection } from "../../connections/components/ConnectedPeopleSection";
import { ConnectedWorkSection } from "../../connections/components/ConnectedWorkSection";
import { RECORD_SECTIONS_GRID_CLASS_NAME } from "../../constants/crmPageContent";
import { useCrmPermissions } from "../../hooks/useCrmPermissions";
import { formatDate, toPlainWords } from "../../utils/format.utils";
import { crmTicketsApi } from "../api/ticketsApi";
import type { TicketWithComments } from "../api/ticketsSchemas";
import { toTicketQueryKey } from "../constants/ticketQueryKeys";
import { TICKET_STATUS_TONE } from "../constants/ticketStatusTone";
import { TicketCommentsSection } from "./TicketCommentsSection";
import { TicketHandlingSection } from "./TicketHandlingSection";

const routeApi = getRouteApi("/_authenticated/crm/support/$ticketId");

const TicketReportSection = ({ ticket }: { ticket: TicketWithComments }) => {
  const { description, type, createdAt, resolvedAt } = ticket;

  return (
    <MetricSection title="What was reported" description={`${toPlainWords(type)} ticket`}>
      <p className="whitespace-pre-wrap text-sm text-foreground">{description}</p>
      <div className="mt-3 border-t border-border/60">
        <MetricRow label="Opened" value={formatDate(createdAt)} />
        {resolvedAt && <MetricRow label="Resolved" value={formatDate(resolvedAt)} />}
      </div>
    </MetricSection>
  );
};

export const TicketDetailPage = () => {
  const { ticketId } = routeApi.useParams();
  const { organization, hasPermission } = useCrmPermissions();
  const ticketSubject = { subjectType: "ticket", subjectId: ticketId } as const;

  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery({
    queryKey: toTicketQueryKey(ticketId),
    queryFn: () => crmTicketsApi.getTicket(ticketId),
  });
  const { data: members } = useQuery({
    queryKey: ["crm-members"],
    queryFn: crmApi.listMembers,
    enabled: hasPermission("members:read"),
  });

  return (
    <div>
      {organization && (
        <PlanGateBanner advancedFeaturesEnabled={organization.advancedFeaturesEnabled} />
      )}
      <BackLink to="/crm/support">All tickets</BackLink>

      {isLoading && <RecordDetailSkeleton />}
      {error && <FormBanner className="mt-4">{getErrorMessage(error)}</FormBanner>}

      {ticket && (
        <div className="mt-4 space-y-6">
          <CrmPageHeader
            title={ticket.title}
            description={`${toPlainWords(ticket.type)} · looked after by ${ticket.assigneeName ?? "no one yet"}`}
            actions={
              <Badge tone={TICKET_STATUS_TONE[ticket.status]}>{toPlainWords(ticket.status)}</Badge>
            }
          />

          <div className={RECORD_SECTIONS_GRID_CLASS_NAME}>
            <TicketReportSection ticket={ticket} />
            <TicketHandlingSection
              ticket={ticket}
              members={members ?? []}
              canWrite={hasPermission("tickets:write")}
              canManageAssignee={hasPermission("tickets:manage")}
            />
          </div>

          <TicketCommentsSection ticket={ticket} canWrite={hasPermission("tickets:write")} />
          <ConnectedPeopleSection subject={ticketSubject} />
          <ConnectedWorkSection subject={ticketSubject} />
        </div>
      )}
    </div>
  );
};
