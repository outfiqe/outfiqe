import { Button, FormBanner, Input, Modal, Select } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import { type ContactInput, crmContactsApi } from "./contactsApi";
import { type Contact, contactLifecycleStageSchema } from "./contactsSchemas";

const CONTACTS_QUERY_KEY = ["crm-contacts"];

const LIFECYCLE_STAGES = contactLifecycleStageSchema.options;

const STAGE_LABELS: Record<(typeof LIFECYCLE_STAGES)[number], string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  CUSTOMER: "Customer",
  PARTNER: "Partner",
  OTHER: "Other",
};

type ContactFormModalProps = {
  open: boolean;
  onClose: () => void;
  contact: Contact | null;
};

const emptyOrNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseTags = (raw: string): string[] =>
  raw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

export const ContactFormModal = ({ open, onClose, contact }: ContactFormModalProps) => {
  const queryClient = useQueryClient();
  const isEditing = contact !== null;

  const [name, setName] = useState(contact?.name ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [company, setCompany] = useState(contact?.company ?? "");
  const [jobTitle, setJobTitle] = useState(contact?.jobTitle ?? "");
  const [lifecycleStage, setLifecycleStage] = useState(contact?.lifecycleStage ?? "LEAD");
  const [source, setSource] = useState(contact?.source ?? "");
  const [tags, setTags] = useState((contact?.tags ?? []).join(", "));
  const [ownerMembershipId, setOwnerMembershipId] = useState(contact?.ownerMembershipId ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");

  const { data: members } = useQuery({
    queryKey: ["crm-members"],
    queryFn: crmApi.listMembers,
    enabled: open,
  });

  const buildBody = (): ContactInput => ({
    name: name.trim(),
    email: emptyOrNull(email),
    phone: emptyOrNull(phone),
    company: emptyOrNull(company),
    jobTitle: emptyOrNull(jobTitle),
    lifecycleStage,
    source: emptyOrNull(source),
    tags: parseTags(tags),
    notes: emptyOrNull(notes),
    ownerMembershipId: ownerMembershipId || null,
  });

  const save = useMutation({
    mutationFn: () =>
      isEditing
        ? crmContactsApi.updateContact(contact.id, buildBody())
        : crmContactsApi.createContact(buildBody()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
      onClose();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  const activeMembers = (members ?? []).filter((member) => member.status === "ACTIVE");

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit contact" : "New contact"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="contact-name" className="text-xs text-muted-foreground">
            Name
          </label>
          <Input
            id="contact-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="contact-email" className="text-xs text-muted-foreground">
              Email
            </label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-phone" className="text-xs text-muted-foreground">
              Phone
            </label>
            <Input
              id="contact-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="contact-company" className="text-xs text-muted-foreground">
              Company
            </label>
            <Input
              id="contact-company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-title" className="text-xs text-muted-foreground">
              Job title
            </label>
            <Input
              id="contact-title"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="contact-stage" className="text-xs text-muted-foreground">
              Lifecycle stage
            </label>
            <Select
              id="contact-stage"
              value={lifecycleStage}
              onChange={(event) =>
                setLifecycleStage(event.target.value as (typeof LIFECYCLE_STAGES)[number])
              }
            >
              {LIFECYCLE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-owner" className="text-xs text-muted-foreground">
              Owner
            </label>
            <Select
              id="contact-owner"
              value={ownerMembershipId}
              onChange={(event) => setOwnerMembershipId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.userName}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="contact-source" className="text-xs text-muted-foreground">
              Source
            </label>
            <Input
              id="contact-source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-tags" className="text-xs text-muted-foreground">
              Tags (comma separated)
            </label>
            <Input
              id="contact-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contact-notes" className="text-xs text-muted-foreground">
            Notes
          </label>
          <textarea
            id="contact-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        {save.isError && <FormBanner>{getErrorMessage(save.error)}</FormBanner>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={name.trim().length === 0 || save.isPending}>
            {save.isPending ? "Saving…" : isEditing ? "Save contact" : "Create contact"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
