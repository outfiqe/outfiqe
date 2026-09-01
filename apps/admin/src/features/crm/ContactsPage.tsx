import { Button, FormBanner, Input, Select, Skeleton } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { ContactFormModal } from "./ContactFormModal";
import { crmContactsApi } from "./contactsApi";
import { type Contact, contactLifecycleStageSchema } from "./contactsSchemas";
import { formatDate } from "./format.utils";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;
const CONTACTS_QUERY_KEY = ["crm-contacts"];

const STAGE_LABELS: Record<string, string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  CUSTOMER: "Customer",
  PARTNER: "Partner",
  OTHER: "Other",
};

export const ContactsPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const debounced = useDebouncedValue(searchTerm, SEARCH_DEBOUNCE_MS);

  const {
    data: contactPage,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...CONTACTS_QUERY_KEY, debounced, stageFilter, page],
    queryFn: () =>
      crmContactsApi.listContacts({
        q: debounced || undefined,
        lifecycleStage: contactLifecycleStageSchema.safeParse(stageFilter).data,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const remove = useMutation({
    mutationFn: (contactId: string) => crmContactsApi.deleteContact(contactId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY }),
  });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-foreground">Contacts</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={stageFilter}
            onChange={(event) => {
              setStageFilter(event.target.value);
              setPage(1);
            }}
            className="w-40"
            aria-label="Filter by lifecycle stage"
          >
            <option value="">All stages</option>
            {contactLifecycleStageSchema.options.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </Select>
          <Input
            type="search"
            placeholder="Search contacts"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            className="w-56"
          />
          <Button size="sm" onClick={openCreate}>
            New contact
          </Button>
        </div>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        People your team tracks by hand — leads, prospects, and other contacts.
      </p>

      <div className="mt-6">
        {isLoading && <Skeleton className="h-40 w-full" />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}
        {remove.isError && <FormBanner>{getErrorMessage(remove.error)}</FormBanner>}

        {contactPage && contactPage.items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {debounced || stageFilter
              ? "No contacts match your filters."
              : "No contacts yet. Add the first one."}
          </p>
        )}

        {contactPage && contactPage.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Stage</th>
                  <th className="py-2 pr-4">Owner</th>
                  <th className="py-2 pr-4">Added</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {contactPage.items.map((contact) => (
                  <tr key={contact.id} className="border-t border-border">
                    <td className="py-2 pr-4">
                      <button
                        type="button"
                        onClick={() => openEdit(contact)}
                        className="cursor-pointer font-semibold text-primary-strong underline"
                      >
                        {contact.name}
                      </button>
                      {contact.email && (
                        <span className="ml-2 text-muted-foreground">{contact.email}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{contact.company ?? "—"}</td>
                    <td className="py-2 pr-4">{STAGE_LABELS[contact.lifecycleStage]}</td>
                    <td className="py-2 pr-4">{contact.ownerName ?? "Unassigned"}</td>
                    <td className="py-2 pr-4">{formatDate(contact.createdAt)}</td>
                    <td className="py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(contact.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{contactPage.total} total</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!contactPage.hasMore}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ContactFormModal
        key={editing?.id ?? "new"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contact={editing}
      />
    </div>
  );
};
