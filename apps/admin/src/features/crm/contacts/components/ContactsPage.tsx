import {
  Button,
  ConfirmModal,
  FormBanner,
  SearchInput,
  Select,
  Table,
  type TableColumn,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { TableSkeleton } from "@/components/TableSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";
import { rawTextFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { CrmMemberFilter } from "../../components/CrmMemberFilter";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { CrmPagination } from "../../components/CrmPagination";
import { CrmTermHint } from "../../components/CrmTermHint";
import { CsvExportButton } from "../../components/CsvExportButton";
import { CONTACT_TABLE_HEADERS, CRM_PAGE_TEXT } from "../../constants/crmPageContent";
import { CRM_TERMS } from "../../constants/crmTerms";
import { useCrmCsvExport } from "../../hooks/useCrmCsvExport";
import { useCrmListFilters } from "../../hooks/useCrmListFilters";
import { useNewRecordModal } from "../../hooks/useNewRecordModal";
import { formatDate } from "../../utils/format.utils";
import { crmContactsApi } from "../api/contactsApi";
import { type Contact, contactLifecycleStageSchema } from "../api/contactsSchemas";
import { STAGE_LABELS } from "../constants/contactLabels";
import { CONTACTS_QUERY_KEY } from "../constants/contactQueryKeys";
import { ContactFormModal } from "./ContactFormModal";

const PAGE_SIZE = 25;
const EXPORT_FILE_NAME = "contacts.csv";
const EXPORT_FAILURE_MESSAGE = "Couldn't export your contacts. Try narrowing your filters.";

const toContactColumns = (askToDelete: (contact: Contact) => void): TableColumn<Contact>[] => [
  {
    key: "name",
    header: "Name",
    render: ({ id, name, email }) => (
      <>
        <Link
          to="/crm/contacts/$contactId"
          params={{ contactId: id }}
          className="cursor-pointer font-semibold text-primary-strong underline"
        >
          {name}
        </Link>
        {email && <span className="ml-2 text-muted-foreground">{email}</span>}
      </>
    ),
  },
  { key: "company", header: "Company", render: ({ company }) => company ?? "—" },
  {
    key: "stage",
    header: <CrmTermHint term="Stage" tip={CRM_TERMS.contactStage} />,
    render: ({ lifecycleStage }) => STAGE_LABELS[lifecycleStage],
  },
  { key: "owner", header: "Owner", render: ({ ownerName }) => ownerName ?? "Unassigned" },
  { key: "added", header: "Added", render: ({ createdAt }) => formatDate(createdAt) },
  {
    key: "actions",
    header: "",
    align: "right",
    render: (contact) => (
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive"
        onClick={(event) => {
          event.stopPropagation();
          askToDelete(contact);
        }}
      >
        Delete
      </Button>
    ),
  },
];

export const ContactsPage = () => {
  const navigate = useNavigate();
  const { searchText, changeSearchText, search, page, goToPage, changeFilter } =
    useCrmListFilters();
  const [stageFilter] = useSearchFilter("stage", rawTextFilter);
  const [ownerFilter] = useSearchFilter("owner", rawTextFilter);
  const { isNewRecordModalOpen, openNewRecordModal, closeNewRecordModal } = useNewRecordModal();
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const contactFilters = {
    q: search,
    lifecycleStage: contactLifecycleStageSchema.safeParse(stageFilter).data,
    ownerMembershipId: ownerFilter || undefined,
  };

  const {
    data: contactPage,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...CONTACTS_QUERY_KEY, contactFilters, page],
    queryFn: () => crmContactsApi.listContacts({ ...contactFilters, page, pageSize: PAGE_SIZE }),
  });

  const remove = useApiMutation({
    mutationFn: (contactId: string) => crmContactsApi.deleteContact(contactId),
    invalidateKeys: [CONTACTS_QUERY_KEY],
    successMessage: "Contact deleted.",
    onSuccess: () => setContactToDelete(null),
  });

  const { exportCsv, isExporting } = useCrmCsvExport(
    () => crmContactsApi.exportContacts(contactFilters),
    EXPORT_FILE_NAME,
    EXPORT_FAILURE_MESSAGE,
  );

  return (
    <div>
      <CrmPageHeader
        {...CRM_PAGE_TEXT.contacts}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={stageFilter}
              onChange={(event) => changeFilter({ stage: event.target.value || undefined })}
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
            <CrmMemberFilter
              label="Filter by owner"
              allLabel="All owners"
              value={ownerFilter}
              onChange={(owner) => changeFilter({ owner: owner || undefined })}
            />
            <SearchInput
              placeholder="Search contacts"
              value={searchText}
              onValueChange={changeSearchText}
              className="w-56"
            />
            <CsvExportButton isExporting={isExporting} onExport={() => void exportCsv()} />
            <Button size="sm" onClick={openNewRecordModal}>
              New contact
            </Button>
          </div>
        }
      />

      <div className="mt-6">
        {isLoading && <TableSkeleton headers={CONTACT_TABLE_HEADERS} />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}
        {remove.isError && <FormBanner>{getErrorMessage(remove.error)}</FormBanner>}

        {contactPage && contactPage.items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {search || stageFilter || ownerFilter
              ? "No contacts match your filters."
              : "No contacts yet. Add the first person you work with, like a buyer or a supplier."}
          </p>
        )}

        {contactPage && contactPage.items.length > 0 && (
          <>
            <Table
              caption="Contacts"
              columns={toContactColumns(setContactToDelete)}
              rows={contactPage.items}
              rowKey={({ id }) => id}
              onRowClick={({ id }) =>
                void navigate({ to: "/crm/contacts/$contactId", params: { contactId: id } })
              }
            />
            <CrmPagination
              total={contactPage.total}
              page={page}
              hasMore={contactPage.hasMore}
              onPageChange={goToPage}
            />
          </>
        )}
      </div>

      {isNewRecordModalOpen && (
        <ContactFormModal open onClose={closeNewRecordModal} contact={null} />
      )}

      <ConfirmModal
        open={contactToDelete !== null}
        title="Delete this contact?"
        description={`${contactToDelete?.name ?? "This contact"}, their notes and their tasks will be removed for your whole team. This can't be undone.`}
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        destructive
        isPending={remove.isPending}
        onConfirm={() => {
          if (contactToDelete) remove.mutate(contactToDelete.id);
        }}
        onCancel={() => setContactToDelete(null)}
      />
    </div>
  );
};
