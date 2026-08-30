import { Badge, Button, FormBanner, Input, Modal, Select, Skeleton } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmActivitiesApi } from "./activitiesApi";
import type { Task } from "./activitiesSchemas";
import { crmApi } from "./api";
import { formatDate } from "./format.utils";
import { PlanGateBanner } from "./PlanGateBanner";

const TASKS_QUERY_KEY = ["crm-tasks"];

const isOverdue = (task: Task) => task.status === "OPEN" && new Date(task.dueAt) < new Date();

const NewTaskModal = ({
  open,
  onClose,
  members,
}: {
  open: boolean;
  onClose: () => void;
  members: { id: string; userName: string }[];
}) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [assigneeMembershipId, setAssigneeMembershipId] = useState(members[0]?.id ?? "");
  const [dueAt, setDueAt] = useState("");

  const create = useMutation({
    mutationFn: () =>
      crmActivitiesApi.createTask({
        title: title.trim(),
        assigneeMembershipId,
        ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      onClose();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="task-title" className="text-xs text-muted-foreground">
            Title
          </label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="task-assignee" className="text-xs text-muted-foreground">
            Assignee
          </label>
          <Select
            id="task-assignee"
            value={assigneeMembershipId}
            onChange={(e) => setAssigneeMembershipId(e.target.value)}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.userName}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="task-due" className="text-xs text-muted-foreground">
            Due date (optional)
          </label>
          <Input
            id="task-due"
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>

        {create.isError && <FormBanner>{getErrorMessage(create.error)}</FormBanner>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={title.trim().length === 0 || assigneeMembershipId === "" || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const TasksPage = () => {
  const queryClient = useQueryClient();
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

  const toggleTask = useMutation({
    mutationFn: (task: Task) =>
      crmActivitiesApi.updateTask(task.id, { status: task.status === "OPEN" ? "DONE" : "OPEN" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });

  return (
    <div>
      {organization && (
        <PlanGateBanner advancedFeaturesEnabled={organization.advancedFeaturesEnabled} />
      )}

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Tasks</h1>
        {members && members.length > 0 && (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            New task
          </Button>
        )}
      </div>

      <div className="mt-6">
        {isLoading && <Skeleton className="h-40 w-full" />}
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
