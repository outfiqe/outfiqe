import { createFileRoute } from "@tanstack/react-router";

import { ContactsPage } from "@/features/crm/ContactsPage";

export const Route = createFileRoute("/_authenticated/crm/contacts/")({
  component: ContactsPage,
});
