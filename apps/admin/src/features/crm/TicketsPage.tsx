import { Badge, Button, FormBanner, Input, Modal, Select, Skeleton } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import { CrmTabs } from "./CrmTabs";
import { formatDate } from "./format.utils";
import { PlanGateBanner } from "./PlanGateBanner";
import { crmRelationshipsApi } from "./relationshipsApi";
import { TicketDetail } from "./TicketDetail";
import { crmTicketsApi } from "./ticketsApi";
import {
  TICKET_STATUSES,
  TICKET_TYPES,
  type TicketStatusValue,
  type TicketTypeValue,
} from "./ticketsSchemas";

const TICKETS_QUERY_KEY = ["crm-tickets"];
const OPTIONS_PAGE_SIZE = 100;

const NewTicketModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [type, setType] = useState<TicketTypeValue>("COMPLAINT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState("");

  const { data: customerPage } = useQuery({
    queryKey: ["crm-customer-options"],
    queryFn: () => crmRelationshipsApi.listCustomers({ pageSize: OPTIONS_PAGE_SIZE }),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () =>
      crmTicketsApi.createTicket({
        type,
        title: title.trim(),
        description: description.trim(),
        subjectType: "customer",
        subjectId: customerId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      onClose();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="New ticket">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="ticket-type" className="text-xs text-muted-foreground">
            Type
          </label>
          <Select
            id="ticket-type"
            value={type}
            onChange={(event) =>
              setType(event.target.value === "REQUEST" ? "REQUEST" : "COMPLAINT")
            }
          >
            {TICKET_TYPES.map((value) => (
              <option key={value} value={value}>
                {value.toLowerCase()}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ticket-title" className="text-xs text-muted-foreground">
            Title
          </label>
          <Input
            id="ticket-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ticket-desc" className="text-xs text-muted-foreground">
            Description
          </label>
          <textarea
            id="ticket-desc"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ticket-customer" className="text-xs text-muted-foreground">
            Customer
          </label>
          <Select
            id="ticket-customer"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            required
          >
            <option value="">Select a customer…</option>
            {(customerPage?.items ?? []).map((customer) => (
              <option key={customer.userId} value={customer.userId}>
                {customer.name} (@{customer.handle})
              </option>
            ))}
          </Select>
        </div>

        {create.isError && <FormBanner>{getErrorMessage(create.error)}</FormBanner>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              title.trim().length === 0 ||
              description.trim().length === 0 ||
              customerId === "" ||
              create.isPending
            }
          >
            {create.isPending ? "Creating…" : "Create ticket"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const TicketsPage = () => {
  const { data: organization } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
  });

  const canReadMembers =
    organization?.viewerIsSuperAdmin || organization?.viewerPermissionKeys.includes("members:read");
  const { data: members } = useQuery({
    queryKey: ["crm-members"],
    queryFn: crmApi.listMembers,
    enabled: Boolean(canReadMembers),
  });

  const [statusFilter, setStatusFilter] = useState<TicketStatusValue | "">("");
  const {
    data: tickets,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...TICKETS_QUERY_KEY, statusFilter],
    queryFn: () => crmTicketsApi.listTickets(statusFilter ? { status: statusFilter } : {}),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

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
        <h1 className="font-display text-2xl font-bold text-foreground">Support</h1>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter((event.target.value as TicketStatusValue | "") || "")
            }
            className="w-40"
          >
            <option value="">All statuses</option>
            {TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ").toLowerCase()}
              </option>
            ))}
          </Select>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            New ticket
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {isLoading && <Skeleton className="h-40 w-full" />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}

        {tickets && tickets.length === 0 && (
          <p className="text-sm text-muted-foreground">No tickets yet.</p>
        )}

        {tickets && tickets.length > 0 && (
          <ul className="space-y-2">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedTicketId((current) => (current === ticket.id ? null : ticket.id))
                  }
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3 text-left text-sm"
                >
                  <span>
                    {ticket.title}
                    <span className="ml-2 text-muted-foreground">{ticket.type.toLowerCase()}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {ticket.assigneeName ?? "unassigned"} · {formatDate(ticket.createdAt)}
                    <Badge>{ticket.status.replace("_", " ").toLowerCase()}</Badge>
                  </span>
                </button>

                {selectedTicketId === ticket.id && (
                  <div className="mt-2">
                    <TicketDetail
                      ticketId={ticket.id}
                      members={(members ?? []).map((member) => ({
                        id: member.id,
                        userName: member.userName,
                      }))}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && <NewTicketModal open={modalOpen} onClose={() => setModalOpen(false)} />}
    </div>
  );
};
