import { Badge, Button, ConfirmModal, FormBanner } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { BackLink } from "@/components/BackLink";
import { MetricEmptyState, MetricRow, MetricSection } from "@/components/MetricParts";
import { getErrorMessage } from "@/lib/errorMessages";

import { TimelineSection } from "../../activities/components/TimelineSection";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { RecordDetailSkeleton } from "../../components/CrmSkeletons";
import { CrmTermHint } from "../../components/CrmTermHint";
import { ConnectedPeopleSection } from "../../connections/components/ConnectedPeopleSection";
import { ConnectedWorkSection } from "../../connections/components/ConnectedWorkSection";
import { RECORD_SECTIONS_GRID_CLASS_NAME } from "../../constants/crmPageContent";
import { CRM_TERMS } from "../../constants/crmTerms";
import { useCrmPermissions } from "../../hooks/useCrmPermissions";
import { formatDate } from "../../utils/format.utils";
import { crmContactsApi } from "../api/contactsApi";
import type { Contact } from "../api/contactsSchemas";
import { STAGE_LABELS } from "../constants/contactLabels";
import { CONTACTS_QUERY_KEY, toContactQueryKey } from "../constants/contactQueryKeys";
import { ContactFormModal } from "./ContactFormModal";

const routeApi = getRouteApi("/_authenticated/crm/contacts/$contactId");

const CONTACTS_WRITE_PERMISSION = "contacts:write";
const CONTACTS_DELETE_PERMISSION = "contacts:delete";
const NOT_ADDED_LABEL = "Not added";
const CONTACT_LINK_CLASS_NAME = "break-all text-primary-strong underline";

const toContactDescription = ({ jobTitle, company, lifecycleStage }: Contact) =>
  [jobTitle, company, STAGE_LABELS[lifecycleStage]].filter(Boolean).join(" · ");

const toLinkedAccountLabel = ({ linkedUserName, linkedUserHandle }: Contact) => {
  if (!linkedUserName) return "None";
  return linkedUserHandle ? `${linkedUserName} (@${linkedUserHandle})` : linkedUserName;
};

const ContactReachSection = ({ contact }: { contact: Contact }) => (
  <MetricSection title="How to reach them" description="Their contact details and where they work.">
    <MetricRow
      label="Email"
      hasLongValue
      value={
        contact.email ? (
          <a href={`mailto:${contact.email}`} className={CONTACT_LINK_CLASS_NAME}>
            {contact.email}
          </a>
        ) : (
          NOT_ADDED_LABEL
        )
      }
    />
    <MetricRow
      label="Phone"
      hasLongValue
      value={
        contact.phone ? (
          <a href={`tel:${contact.phone}`} className={CONTACT_LINK_CLASS_NAME}>
            {contact.phone}
          </a>
        ) : (
          NOT_ADDED_LABEL
        )
      }
    />
    <MetricRow label="Company" hasLongValue value={contact.company ?? NOT_ADDED_LABEL} />
    <MetricRow label="Job title" hasLongValue value={contact.jobTitle ?? NOT_ADDED_LABEL} />
  </MetricSection>
);

const ContactRelationshipSection = ({ contact }: { contact: Contact }) => (
  <MetricSection
    title="Your relationship"
    description="How far along they are and who on your team knows them."
  >
    <MetricRow
      label={<CrmTermHint term="Stage" tip={CRM_TERMS.contactStage} />}
      value={STAGE_LABELS[contact.lifecycleStage]}
    />
    <MetricRow label="Looked after by" hasLongValue value={contact.ownerName ?? "Unassigned"} />
    <MetricRow
      label="Where they came from"
      hasLongValue
      value={contact.source ?? NOT_ADDED_LABEL}
    />
    <MetricRow label="Outfiqe account" hasLongValue value={toLinkedAccountLabel(contact)} />
    <MetricRow label="Added" value={formatDate(contact.createdAt)} />
    <MetricRow label="Last updated" value={formatDate(contact.updatedAt)} />
  </MetricSection>
);

const ContactNotesSection = ({ contact }: { contact: Contact }) => (
  <MetricSection title="Notes and tags" description="Anything your team should remember.">
    {contact.tags.length > 0 && (
      <div className="mb-3 flex flex-wrap gap-2">
        {contact.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    )}
    {contact.notes ? (
      <p className="whitespace-pre-wrap text-sm text-foreground">{contact.notes}</p>
    ) : (
      <MetricEmptyState>No notes yet.</MetricEmptyState>
    )}
  </MetricSection>
);

export const ContactDetailPage = () => {
  const { contactId } = routeApi.useParams();
  const navigate = useNavigate();
  const { hasPermission } = useCrmPermissions();
  const contactSubject = { subjectType: "contact", subjectId: contactId } as const;

  const {
    data: contact,
    isLoading,
    error,
  } = useQuery({
    queryKey: toContactQueryKey(contactId),
    queryFn: () => crmContactsApi.getContact(contactId),
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const removeContact = useApiMutation({
    mutationFn: () => crmContactsApi.deleteContact(contactId),
    invalidateKeys: [CONTACTS_QUERY_KEY],
    successMessage: "Contact deleted.",
    errorMessage: getErrorMessage,
    onSuccess: () => navigate({ to: "/crm/contacts" }),
    onError: () => setIsConfirmingDelete(false),
  });

  return (
    <div>
      <BackLink to="/crm/contacts">All contacts</BackLink>

      {isLoading && <RecordDetailSkeleton />}
      {error && <FormBanner className="mt-4">{getErrorMessage(error)}</FormBanner>}

      {contact && (
        <div className="mt-4 space-y-6">
          <CrmPageHeader
            title={contact.name}
            description={toContactDescription(contact)}
            actions={
              <>
                {hasPermission(CONTACTS_WRITE_PERMISSION) && (
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
                {hasPermission(CONTACTS_DELETE_PERMISSION) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setIsConfirmingDelete(true)}
                  >
                    Delete
                  </Button>
                )}
              </>
            }
          />

          <div className={RECORD_SECTIONS_GRID_CLASS_NAME}>
            <ContactReachSection contact={contact} />
            <ContactRelationshipSection contact={contact} />
          </div>
          <ContactNotesSection contact={contact} />
          <ConnectedPeopleSection subject={contactSubject} />
          <ConnectedWorkSection subject={contactSubject} />
          <TimelineSection {...contactSubject} />

          {isEditing && (
            <ContactFormModal
              open={isEditing}
              onClose={() => setIsEditing(false)}
              contact={contact}
            />
          )}
        </div>
      )}

      <ConfirmModal
        open={isConfirmingDelete}
        title="Delete this contact?"
        description={`${contact?.name ?? "This contact"}, their notes and their tasks will be removed for your whole team. This can't be undone.`}
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        destructive
        isPending={removeContact.isPending}
        onConfirm={() => removeContact.mutate()}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </div>
  );
};
