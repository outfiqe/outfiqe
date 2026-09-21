import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
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
  toast,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmActivitiesApi } from "./activitiesApi";
import type { Task } from "./activitiesSchemas";
import { crmApi } from "./api";
import { CompactRowSkeleton } from "./CompactRowSkeleton";
import { CRM_PAGE_TEXT } from "./crmPageContent";
import { formatDate } from "./format.utils";
import { PlanGateBanner } from "./PlanGateBanner";
import { taskFormSchema, type TaskFormValues } from "./taskForm.schema";

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
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { title: "", assigneeMembershipId: members[0]?.id ?? "", dueAt: "" },
    mode: "onTouched",
  });

  const create = useApiMutation({
    mutationFn: (values: TaskFormValues) =>
      crmActivitiesApi.createTask({
        title: values.title.trim(),
        assigneeMembershipId: values.assigneeMembershipId,
        ...(values.dueAt ? { dueAt: new Date(values.dueAt).toISOString() } : {}),
      }),
    invalidateKeys: [TASKS_QUERY_KEY],
    successMessage: "Task created.",
    onSuccess: () => onClose(),
  });

  const submitTask = form.handleSubmit((values) => create.mutate(values));

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <Form {...form}>
        <form onSubmit={submitTask} noValidate className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assigneeMembershipId"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">
                  Assignee
                </FormLabel>
                <FormControl>
                  <Select {...field}>
                    {members.map((member) => (
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
          <FormField
            control={form.control}
            name="dueAt"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">
                  Due date (optional)
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {create.isError && <FormBanner>{getErrorMessage(create.error)}</FormBanner>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={create.isPending}>
              Create task
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};

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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {CRM_PAGE_TEXT.tasks.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{CRM_PAGE_TEXT.tasks.description}</p>
        </div>
        {members && members.length > 0 && (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            New task
          </Button>
        )}
      </div>

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
