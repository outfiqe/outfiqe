import { createFileRoute } from "@tanstack/react-router";

import { UsersPage } from "@/features/users/components/UsersPage";

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});
