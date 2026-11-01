import { Button } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  MetricEmptyState,
  MetricLinkRow,
  MetricRow,
  MetricSection,
} from "@/components/MetricParts";

import { NewTaskModal } from "../../activities/components/NewTaskModal";
import { crmApi } from "../../api/crmApi";
import { useCrmPermissions } from "../../hooks/useCrmPermissions";
import { formatDate, formatRupees, toPlainWords } from "../../utils/format.utils";
import type { ConnectionSubject } from "../api/connectionsApi";
import type { CrmConnections } from "../api/connectionsSchemas";
import { useConnectedRecords } from "../hooks/useConnectedRecords";

const TICKET_SUBJECT_TYPE = "ticket";

const ConnectedDeals = ({ deals }: { deals: NonNullable<CrmConnections["deals"]> }) => (
  <MetricSection title="Opportunities" description="Sales with the same people.">
    {deals.length === 0 ? (
      <MetricEmptyState>No other opportunities yet.</MetricEmptyState>
    ) : (
      deals.map(({ id, title, value, status, stageName }) => (
        <MetricLinkRow
          key={id}
          to={`/crm/pipeline/${id}`}
          label={title}
          detail={`${stageName} · ${toPlainWords(status)}`}
          value={formatRupees(value)}
        />
      ))
    )}
  </MetricSection>
);

const ConnectedTickets = ({ tickets }: { tickets: NonNullable<CrmConnections["tickets"]> }) => (
  <MetricSection title="Tickets" description="Problems and requests from the same people.">
    {tickets.length === 0 ? (
      <MetricEmptyState>No other tickets yet.</MetricEmptyState>
    ) : (
      tickets.map(({ id, title, type, status }) => (
        <MetricLinkRow
          key={id}
          to={`/crm/support/${id}`}
          label={title}
          detail={toPlainWords(type)}
          value={toPlainWords(status)}
        />
      ))
    )}
  </MetricSection>
);

const ConnectedTasks = ({
  tasks,
  subject,
}: {
  tasks: NonNullable<CrmConnections["tasks"]>;
  subject: ConnectionSubject;
}) => {
  const { hasPermission } = useCrmPermissions();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const canReadMembers = hasPermission("members:read");
  const { data: members } = useQuery({
    queryKey: ["crm-members"],
    queryFn: crmApi.listMembers,
    enabled: canReadMembers,
  });
  const { subjectType, subjectId } = subject;
  const taskSubject = subjectType === TICKET_SUBJECT_TYPE ? null : { subjectType, subjectId };

  return (
    <MetricSection title="Open tasks" description="What still needs doing.">
      {tasks.length === 0 ? (
        <MetricEmptyState>Nothing to do right now.</MetricEmptyState>
      ) : (
        tasks.map(({ id, title, dueAt, assigneeName }) => (
          <MetricRow
            key={id}
            label={title}
            detail={`Due ${formatDate(dueAt)} · ${assigneeName}`}
            value=""
          />
        ))
      )}
      {taskSubject && members && hasPermission("tasks:write") && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setIsAddingTask(true)}
          >
            Add a task
          </Button>
          {isAddingTask && (
            <NewTaskModal
              open={isAddingTask}
              onClose={() => setIsAddingTask(false)}
              members={members}
              subject={taskSubject}
            />
          )}
        </>
      )}
    </MetricSection>
  );
};

export const ConnectedWorkSection = ({ subject }: { subject: ConnectionSubject }) => {
  const { data: connections } = useConnectedRecords(subject);
  if (!connections) return null;

  const { deals, tickets, tasks } = connections;
  if (!deals && !tickets && !tasks) return null;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      {deals && <ConnectedDeals deals={deals} />}
      {tickets && <ConnectedTickets tickets={tickets} />}
      {tasks && <ConnectedTasks tasks={tasks} subject={subject} />}
    </div>
  );
};
