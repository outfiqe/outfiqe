import { Button, FormBanner, Select } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";

import { MetricSection } from "@/components/MetricParts";
import { getErrorMessage } from "@/lib/errorMessages";

import { toPlainWords } from "../../utils/format.utils";
import { crmTicketsApi } from "../api/ticketsApi";
import {
  TICKET_STATUSES,
  type TicketStatusValue,
  type TicketWithComments,
} from "../api/ticketsSchemas";
import { TICKETS_QUERY_KEY, toTicketQueryKey } from "../constants/ticketQueryKeys";

const UNASSIGNED_VALUE = "";

export const TicketHandlingSection = ({
  ticket,
  members,
  canWrite,
  canManageAssignee,
}: {
  ticket: TicketWithComments;
  members: { id: string; userName: string }[];
  canWrite: boolean;
  canManageAssignee: boolean;
}) => {
  const { id: ticketId, status: currentStatus, assigneeMembershipId } = ticket;
  const ticketInvalidateKeys = [toTicketQueryKey(ticketId), TICKETS_QUERY_KEY];

  const changeStatus = useApiMutation({
    mutationFn: (status: TicketStatusValue) => crmTicketsApi.changeStatus(ticketId, status),
    invalidateKeys: ticketInvalidateKeys,
  });
  const assign = useApiMutation({
    mutationFn: (nextAssigneeId: string | null) => crmTicketsApi.assign(ticketId, nextAssigneeId),
    invalidateKeys: ticketInvalidateKeys,
  });

  return (
    <MetricSection
      title="Handling this ticket"
      description="Update the status as work moves along, and choose who looks after it."
    >
      <p className="text-xs font-medium text-muted-foreground">Status</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {TICKET_STATUSES.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === currentStatus ? "default" : "outline"}
            disabled={!canWrite || status === currentStatus || changeStatus.isPending}
            onClick={() => changeStatus.mutate(status)}
          >
            {toPlainWords(status)}
          </Button>
        ))}
      </div>

      <label className="mt-4 block text-xs font-medium text-muted-foreground">
        Assignee
        <Select
          value={assigneeMembershipId ?? UNASSIGNED_VALUE}
          disabled={!canManageAssignee || assign.isPending}
          onChange={(event) => assign.mutate(event.target.value || null)}
          className="mt-1.5 w-full sm:w-64"
        >
          <option value={UNASSIGNED_VALUE}>Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.userName}
            </option>
          ))}
        </Select>
      </label>

      {(changeStatus.isError || assign.isError) && (
        <FormBanner className="mt-3">
          {getErrorMessage(changeStatus.error ?? assign.error)}
        </FormBanner>
      )}
    </MetricSection>
  );
};
