import { zodResolver } from "@hookform/resolvers/zod";
import {
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
import { useForm } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import {
  contactFormSchema,
  type ContactFormValues,
  EMPTY_CONTACT_FORM,
  parseContactTags,
} from "./contactForm.schema";
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

const LABEL_CLASS = "text-xs font-normal text-muted-foreground";

type ContactFormModalProps = {
  open: boolean;
  onClose: () => void;
  contact: Contact | null;
};

const emptyOrNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toContactInput = (values: ContactFormValues): ContactInput => ({
  name: values.name.trim(),
  email: emptyOrNull(values.email),
  phone: emptyOrNull(values.phone),
  company: emptyOrNull(values.company),
  jobTitle: emptyOrNull(values.jobTitle),
  lifecycleStage: values.lifecycleStage,
  source: emptyOrNull(values.source),
  tags: parseContactTags(values.tags),
  notes: emptyOrNull(values.notes),
  ownerMembershipId: values.ownerMembershipId || null,
});

const toFormValues = (contact: Contact | null): ContactFormValues =>
  contact
    ? {
        name: contact.name,
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        company: contact.company ?? "",
        jobTitle: contact.jobTitle ?? "",
        lifecycleStage: contact.lifecycleStage,
        source: contact.source ?? "",
        tags: contact.tags.join(", "),
        ownerMembershipId: contact.ownerMembershipId ?? "",
        notes: contact.notes ?? "",
      }
    : EMPTY_CONTACT_FORM;

type TextFieldName = "name" | "email" | "phone" | "company" | "jobTitle" | "source" | "tags";

export const ContactFormModal = ({ open, onClose, contact }: ContactFormModalProps) => {
  const isEditing = contact !== null;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: toFormValues(contact),
    mode: "onTouched",
  });

  const { data: members } = useQuery({
    queryKey: ["crm-members"],
    queryFn: crmApi.listMembers,
    enabled: open,
  });

  const save = useApiMutation({
    mutationFn: (values: ContactFormValues) =>
      isEditing
        ? crmContactsApi.updateContact(contact.id, toContactInput(values))
        : crmContactsApi.createContact(toContactInput(values)),
    invalidateKeys: [CONTACTS_QUERY_KEY],
    successMessage: isEditing ? "Contact saved." : "Contact created.",
    onSuccess: () => onClose(),
  });

  const submitContact = form.handleSubmit((values) => save.mutate(values));

  const activeMembers = (members ?? []).filter((member) => member.status === "ACTIVE");

  const textField = (name: TextFieldName, label: string, type = "text") => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="mt-0 space-y-1.5">
          <FormLabel className={LABEL_CLASS}>{label}</FormLabel>
          <FormControl>
            <Input type={type} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit contact" : "New contact"}>
      <Form {...form}>
        <form onSubmit={submitContact} noValidate className="space-y-4">
          {textField("name", "Name")}
          <div className="grid grid-cols-2 gap-3">
            {textField("email", "Email", "email")}
            {textField("phone", "Phone")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {textField("company", "Company")}
            {textField("jobTitle", "Job title")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="lifecycleStage"
              render={({ field }) => (
                <FormItem className="mt-0 space-y-1.5">
                  <FormLabel className={LABEL_CLASS}>Lifecycle stage</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      {LIFECYCLE_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {STAGE_LABELS[stage]}
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
              name="ownerMembershipId"
              render={({ field }) => (
                <FormItem className="mt-0 space-y-1.5">
                  <FormLabel className={LABEL_CLASS}>Owner</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="">Unassigned</option>
                      {activeMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.userName}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {textField("source", "Source")}
            {textField("tags", "Tags (comma separated)")}
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel className={LABEL_CLASS}>Notes</FormLabel>
                <FormControl>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {save.isError && <FormBanner>{getErrorMessage(save.error)}</FormBanner>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={save.isPending}>
              {isEditing ? "Save contact" : "Create contact"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};
