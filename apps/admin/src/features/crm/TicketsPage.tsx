import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Modal,
  Select,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";
import { oneOfFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { crmApi } from "./api";
import { CompactRowSkeleton } from "./CompactRowSkeleton";
import { CRM_PAGE_TEXT } from "./crmPageContent";
import { CustomerSearchField, type SelectedCustomer } from "./CustomerSearchField";
import { formatDate } from "./format.utils";
import { PlanGateBanner } from "./PlanGateBanner";
import { TicketDetail } from "./TicketDetail";
import { ticketFormSchema, type TicketFormValues } from "./ticketForm.schema";
import { crmTicketsApi } from "./ticketsApi";
import { TICKET_STATUSES, TICKET_TYPES, type TicketStatusValue } from "./ticketsSchemas";

const TICKETS_QUERY_KEY = ["crm-tickets"];

const NO_STATUS_FILTER = "";
const TICKET_STATUS_FILTER = oneOfFilter<TicketStatusValue | typeof NO_STATUS_FILTER>(
  TICKET_STATUSES,
  NO_STATUS_FILTER,
);

const LABEL_CLASS = "text-xs font-normal text-muted-foreground";

const NewTicketModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [customer, setCustomer] = useState<SelectedCustomer | null>(null);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: { type: "COMPLAINT", title: "", description: "", customerUserId: "" },
    mode: "onTouched",
  });

  const create = useApiMutation({
    mutationFn: (values: TicketFormValues) =>
      crmTicketsApi.createTicket({
        type: values.type,
        title: values.title.trim(),
        description: values.description.trim(),
        subjectType: "customer",
        subjectId: values.customerUserId,
      }),
    invalidateKeys: [TICKETS_QUERY_KEY],
    successMessage: "Ticket created.",
    onSuccess: () => onClose(),
  });

  const submitTicket = form.handleSubmit((values) => create.mutate(values));

  return (
    <Modal open={open} onClose={onClose} title="New ticket">
      <Form {...form}>
        <form onSubmit={submitTicket} noValidate className="space-y-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel className={LABEL_CLASS}>Type</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {TICKET_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {value.toLowerCase()}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel className={LABEL_CLASS}>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel className={LABEL_CLASS}>Description</FormLabel>
                <FormControl>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="customerUserId"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel htmlFor="ticket-customer" className={LABEL_CLASS}>
                  Customer
                </FormLabel>
                <CustomerSearchField
                  id="ticket-customer"
                  value={customer}
                  onChange={(selected) => {
                    setCustomer(selected);
                    field.onChange(selected?.userId ?? "");
                  }}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {create.isError && <FormBanner>{getErrorMessage(create.error)}</FormBanner>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={create.isPending}>
              Create ticket
            </Button>
          </div>
        </form>
      </Form>
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
  const canWriteTickets =
    organization?.viewerIsSuperAdmin ||
    organization?.viewerPermissionKeys.includes("tickets:write");
  const canManageTickets =
    organization?.viewerIsSuperAdmin ||
    organization?.viewerPermissionKeys.includes("tickets:manage");
  const { data: members } = useQuery({
    queryKey: ["crm-members"],
    queryFn: crmApi.listMembers,
    enabled: Boolean(canReadMembers),
  });

  const [statusFilter, setStatusFilter] = useSearchFilter("status", TICKET_STATUS_FILTER);
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
        <PlanGateBanner advancedFeaturesEnabled={organization.advancedFeaturesEnabled} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {CRM_PAGE_TEXT.tickets.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{CRM_PAGE_TEXT.tickets.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as TicketStatusValue | "")}
            className="w-40"
          >
            <option value="">All statuses</option>
            {TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ").toLowerCase()}
              </option>
            ))}
          </Select>
          {canWriteTickets && (
            <Button size="sm" onClick={() => setModalOpen(true)}>
              New ticket
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {isLoading && <CompactRowSkeleton hasTrailingBadge />}
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
                      canWrite={Boolean(canWriteTickets)}
                      canManageAssignee={Boolean(canManageTickets)}
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
