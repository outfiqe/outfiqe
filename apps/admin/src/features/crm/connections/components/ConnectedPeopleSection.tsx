import { Avatar, Skeleton } from "@outfiqe/design-system";

import { MetricEmptyState, MetricLinkRow, MetricSection } from "@/components/MetricParts";

import { STAGE_LABELS } from "../../contacts/constants/contactLabels";
import type { ConnectionSubject } from "../api/connectionsApi";
import type { CrmConnections } from "../api/connectionsSchemas";
import { useConnectedRecords } from "../hooks/useConnectedRecords";

const PERSON_ROLE_LINKS: Record<
  CrmConnections["people"][number]["role"],
  { path: string; label: string; sameRecordLabel: string }
> = {
  partner: { path: "/crm/partners", label: "View partner", sameRecordLabel: "Also a partner" },
  customer: { path: "/crm/customers", label: "View customer", sameRecordLabel: "Also a customer" },
};

const SAME_PERSON_DETAIL = "This is the same person.";

const ConnectedPeopleRows = ({
  people,
  contacts,
  subjectId,
}: CrmConnections & { subjectId: string }) => {
  const connectedContacts = contacts ?? [];
  if (people.length === 0 && connectedContacts.length === 0) {
    return <MetricEmptyState>No one else is connected to this yet.</MetricEmptyState>;
  }

  return (
    <>
      {people.map(({ userId, name, handle, avatarUrl, role }) => {
        const { path, label, sameRecordLabel } = PERSON_ROLE_LINKS[role];
        const isSamePerson = userId === subjectId;
        return (
          <MetricLinkRow
            key={`${role}:${userId}`}
            to={`${path}/${userId}`}
            label={
              <span className="flex items-center gap-2">
                <Avatar name={name} imageUrl={avatarUrl} size="sm" />
                {isSamePerson ? sameRecordLabel : name}
              </span>
            }
            detail={isSamePerson ? SAME_PERSON_DETAIL : `@${handle}`}
            value={label}
          />
        );
      })}
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
      {connections && <ConnectedPeopleRows {...connections} subjectId={subject.subjectId} />}
    </MetricSection>
  );
};
