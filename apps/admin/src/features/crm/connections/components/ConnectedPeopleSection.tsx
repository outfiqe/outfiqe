import { Skeleton } from "@outfiqe/design-system";

import { MetricEmptyState, MetricLinkRow, MetricSection } from "@/components/MetricParts";

import { STAGE_LABELS } from "../../contacts/constants/contactLabels";
import type { ConnectionSubject } from "../api/connectionsApi";
import type { CrmConnections } from "../api/connectionsSchemas";
import { useConnectedRecords } from "../hooks/useConnectedRecords";

const PERSON_ROLE_LINKS: Record<
  CrmConnections["people"][number]["role"],
  { path: string; label: string }
> = {
  partner: { path: "/crm/partners", label: "View partner" },
  customer: { path: "/crm/customers", label: "View customer" },
};

const ConnectedPeopleRows = ({ people, contacts }: CrmConnections) => {
  const connectedContacts = contacts ?? [];
  if (people.length === 0 && connectedContacts.length === 0) {
    return <MetricEmptyState>No one else is connected to this yet.</MetricEmptyState>;
  }

  return (
    <>
      {people.map(({ userId, name, handle, role }) => (
        <MetricLinkRow
          key={`${role}:${userId}`}
          to={`${PERSON_ROLE_LINKS[role].path}/${userId}`}
          label={name}
          detail={`@${handle}`}
          value={PERSON_ROLE_LINKS[role].label}
        />
      ))}
      {connectedContacts.map(({ id, name, company, lifecycleStage }) => (
        <MetricLinkRow
          key={id}
          to={`/crm/contacts/${id}`}
          label={name}
          detail={company ?? STAGE_LABELS[lifecycleStage]}
          value="View contact"
        />
      ))}
    </>
  );
};

export const ConnectedPeopleSection = ({ subject }: { subject: ConnectionSubject }) => {
  const { data: connections, isLoading, error } = useConnectedRecords(subject);

  return (
    <MetricSection title="People" description="Everyone connected to this record.">
      {isLoading && <Skeleton className="h-10 w-full" />}
      {error && <MetricEmptyState>Connected people are unavailable right now.</MetricEmptyState>}
      {connections && <ConnectedPeopleRows {...connections} />}
    </MetricSection>
  );
};
