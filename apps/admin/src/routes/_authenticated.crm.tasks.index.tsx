import { createFileRoute } from "@tanstack/react-router";

import { TasksPage } from "@/features/crm/TasksPage";

export const Route = createFileRoute("/_authenticated/crm/tasks/")({
  component: TasksPage,
});
