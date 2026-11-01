import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  DateInput,
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
import { useApiMutation, useInfiniteCursorPage } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";
import { FORM_VALIDATION_MODE } from "@/lib/formValidation";
import { oneOfFilter, rawTextFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { toDayRange } from "../../activities/utils/taskDue.utils";
import { crmApi } from "../../api/crmApi";
import { PlanGateBanner } from "../../billing/components/PlanGateBanner";
import { CompactRowSkeleton } from "../../components/CompactRowSkeleton";
import { CrmMemberFilter, UNASSIGNED_FILTER } from "../../components/CrmMemberFilter";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { CRM_PAGE_TEXT } from "../../constants/crmPageContent";
import { useNewRecordModal } from "../../hooks/useNewRecordModal";
import {
  CustomerSearchField,
  type SelectedCustomer,
} from "../../relationships/components/CustomerSearchField";
import { formatDate, toPlainWords } from "../../utils/format.utils";
import { crmTicketsApi } from "../api/ticketsApi";
import { TICKET_STATUSES, TICKET_TYPES, type TicketStatusValue } from "../api/ticketsSchemas";
import { TICKETS_QUERY_KEY } from "../constants/ticketQueryKeys";
import { TICKET_STATUS_TONE } from "../constants/ticketStatusTone";
import { ticketFormSchema, type TicketFormValues } from "../schemas/ticketForm.schema";

const NO_STATUS_FILTER = "";
const STILL_OPEN_FILTER = "ACTIVE";
type TicketStatusFilter = TicketStatusValue | typeof NO_STATUS_FILTER | typeof STILL_OPEN_FILTER;

const TICKET_STATUS_FILTER = oneOfFilter<TicketStatusFilter>(
  [...TICKET_STATUSES, STILL_OPEN_FILTER],
  NO_STATUS_FILTER,
);

const toStatusParams = (statusFilter: TicketStatusFilter) => {
  if (statusFilter === STILL_OPEN_FILTER) return { activeOnly: "true" } as const;
  return statusFilter ? { status: statusFilter } : {};
};

const toAssigneeParams = (assigneeFilter: string) => {
  if (assigneeFilter === UNASSIGNED_FILTER) return { unassignedOnly: "true" } as const;
  return assigneeFilter ? { assigneeMembershipId: assigneeFilter } : {};
};

const LABEL_CLASS = "text-xs font-normal text-muted-foreground";

const NewTicketModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [customer, setCustomer] = useState<SelectedCustomer | null>(null);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: { type: "COMPLAINT", title: "", description: "", customerUserId: "" },
    mode: FORM_VALIDATION_MODE,
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
                        {toPlainWords(value)}
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

  const canWriteTickets =
    organization?.viewerIsSuperAdmin ||
    organization?.viewerPermissionKeys.includes("tickets:write");

  const [statusFilter, setStatusFilter] = useSearchFilter("status", TICKET_STATUS_FILTER);
  const [assigneeFilter, setAssigneeFilter] = useSearchFilter("assignee", rawTextFilter);
  const [dateFrom, setDateFrom] = useSearchFilter("from", rawTextFilter);
  const [dateTo, setDateTo] = useSearchFilter("to", rawTextFilter);
  const hasFilters = Boolean(statusFilter || assigneeFilter || dateFrom || dateTo);

  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteCursorPage(
      [...TICKETS_QUERY_KEY, statusFilter, assigneeFilter, dateFrom, dateTo],
      (cursor) =>
        crmTicketsApi.listTickets({
          ...toStatusParams(statusFilter),
          ...toAssigneeParams(assigneeFilter),
          createdFrom: toDayRange(dateFrom, "start"),
          createdTo: toDayRange(dateTo, "end"),
          cursor,
        }),
    );
  const tickets = data?.pages.flatMap((page) => page.tickets);

  const { isNewRecordModalOpen, openNewRecordModal, closeNewRecordModal } = useNewRecordModal();

  return (
    <div>
      {organization && (
        <PlanGateBanner advancedFeaturesEnabled={organization.advancedFeaturesEnabled} />
      )}

      <CrmPageHeader
        {...CRM_PAGE_TEXT.tickets}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(TICKET_STATUS_FILTER.parse(event.target.value))}
              className="w-40"
            >
              <option value="">All statuses</option>
              <option value={STILL_OPEN_FILTER}>Still open</option>
              {TICKET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {toPlainWords(status)}
                </option>
              ))}
            </Select>
            <CrmMemberFilter
              label="Filter by assignee"
              allLabel="Everyone"
              unassignedLabel="No one yet"
              value={assigneeFilter}
              onChange={setAssigneeFilter}
            />
            <DateInput
              aria-label="From date"
              max={dateTo}
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-40"
            />
            <DateInput
              aria-label="To date"
              min={dateFrom}
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-40"
            />
            {canWriteTickets && (
              <Button size="sm" onClick={openNewRecordModal}>
                New ticket
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-6 space-y-4">
        {isLoading && <CompactRowSkeleton hasTrailingBadge />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}

        {tickets && tickets.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "No tickets match your filters."
              : "No tickets yet. When a customer has a problem, add it here so your team can follow it."}
          </p>
        )}

        {tickets && tickets.length > 0 && (
          <ul className="space-y-2">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  to="/crm/support/$ticketId"
                  params={{ ticketId: ticket.id }}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-muted/60"
                >
                  <span>
                    {ticket.title}
                    <span className="ml-2 text-muted-foreground">{toPlainWords(ticket.type)}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {ticket.assigneeName ?? "unassigned"} · {formatDate(ticket.createdAt)}
                    <Badge tone={TICKET_STATUS_TONE[ticket.status]}>
                      {toPlainWords(ticket.status)}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchNextPage()}
            isLoading={isFetchingNextPage}
          >
            Load more
          </Button>
        )}
      </div>

      {isNewRecordModalOpen && <NewTicketModal open onClose={closeNewRecordModal} />}
    </div>
  );
};
