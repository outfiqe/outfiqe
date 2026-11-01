import { Badge, Button, FormBanner, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "../../api/crmApi";
import { PlanGateBanner } from "../../billing/components/PlanGateBanner";
import { CompactRowSkeleton } from "../../components/CompactRowSkeleton";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { CRM_PAGE_TEXT } from "../../constants/crmPageContent";
import { formatDate } from "../../utils/format.utils";
import { crmActivitiesApi } from "../api/activitiesApi";
import type { Task } from "../api/activitiesSchemas";
import { TASKS_QUERY_KEY } from "../constants/tasksQueryKeys";
import { NewTaskModal } from "./NewTaskModal";

const isOverdue = (task: Task) => task.status === "OPEN" && new Date(task.dueAt) < new Date();

export const TasksPage = () => {
  const { data: organization } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
  });

  const canReadMembers =
    organization?.viewerIsSuperAdmin || organization?.viewerPermissionKeys.includes("members:read");

  const { data: members } = useQuery({
    queryKey: ["crm-members"],
    queryFn: crmApi.listMembers,
    enabled: Boolean(canReadMembers),
  });

  const {
    data: tasks,
    isLoading,
    error,
  } = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: () => crmActivitiesApi.listTasks(),
  });

  const [modalOpen, setModalOpen] = useState(false);

  const toggleTask = useApiMutation({
    mutationFn: (task: Task) =>
      crmActivitiesApi.updateTask(task.id, { status: task.status === "OPEN" ? "DONE" : "OPEN" }),
    invalidateKeys: [TASKS_QUERY_KEY],
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  return (
    <div>
      {organization && (
        <PlanGateBanner advancedFeaturesEnabled={organization.advancedFeaturesEnabled} />
      )}

      <CrmPageHeader
        {...CRM_PAGE_TEXT.tasks}
        actions={
          members &&
          members.length > 0 && (
            <Button size="sm" onClick={() => setModalOpen(true)}>
              New task
            </Button>
          )
        }
      />

      <div className="mt-6">
        {isLoading && <CompactRowSkeleton hasCheckbox />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}

        {tasks && tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        )}

        {tasks && tasks.length > 0 && (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={`Mark ${task.title} ${task.status === "OPEN" ? "done" : "open"}`}
                    checked={task.status === "DONE"}
                    onChange={() => toggleTask.mutate(task)}
                    className="cursor-pointer"
                  />
                  <span
                    className={task.status === "DONE" ? "text-muted-foreground line-through" : ""}
                  >
                    {task.title}
                  </span>
                  {isOverdue(task) && <Badge tone="negative">overdue</Badge>}
                </span>
                <span className="text-xs text-muted-foreground">
                  {task.assigneeName ?? "Unassigned"} · due {formatDate(task.dueAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && members && (
        <NewTaskModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          members={members.map((member) => ({ id: member.id, userName: member.userName }))}
        />
      )}
    </div>
  );
};
