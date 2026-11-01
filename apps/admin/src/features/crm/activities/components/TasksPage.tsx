import { Badge, Button, FilterChip, FormBanner, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errorMessages";
import { oneOfFilter, rawTextFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { PlanGateBanner } from "../../billing/components/PlanGateBanner";
import { CompactRowSkeleton } from "../../components/CompactRowSkeleton";
import { CrmMemberFilter } from "../../components/CrmMemberFilter";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { CRM_PAGE_TEXT } from "../../constants/crmPageContent";
import { useCrmMembers } from "../../hooks/useCrmMembers";
import { useCrmPermissions } from "../../hooks/useCrmPermissions";
import { useNewRecordModal } from "../../hooks/useNewRecordModal";
import { formatDate } from "../../utils/format.utils";
import { crmActivitiesApi } from "../api/activitiesApi";
import type { Task } from "../api/activitiesSchemas";
import { TASKS_QUERY_KEY } from "../constants/tasksQueryKeys";
import { TASK_DUE_FILTERS, type TaskDueFilter, toTaskDueRange } from "../utils/taskDue.utils";
import { NewTaskModal } from "./NewTaskModal";

const OPEN_TASK_STATUS = "OPEN";
const ALL_TASKS = "";
const DUE_FILTER = oneOfFilter<TaskDueFilter | typeof ALL_TASKS>(TASK_DUE_FILTERS, ALL_TASKS);

const DUE_CHIPS: { value: TaskDueFilter | typeof ALL_TASKS; label: string; empty: string }[] = [
  { value: ALL_TASKS, label: "All", empty: "No tasks yet. Add one so nothing gets forgotten." },
  { value: "overdue", label: "Overdue", empty: "Nothing is overdue. Nice work." },
  { value: "today", label: "Today", empty: "Nothing is due today." },
  { value: "upcoming", label: "Upcoming", empty: "Nothing is coming up yet." },
];

const isOverdue = (task: Task) => task.status === "OPEN" && new Date(task.dueAt) < new Date();

export const TasksPage = () => {
  const { organization } = useCrmPermissions();
  const members = useCrmMembers();
  const [dueFilter, setDueFilter] = useSearchFilter("due", DUE_FILTER);
  const [assigneeFilter, setAssigneeFilter] = useSearchFilter("assignee", rawTextFilter);

  const {
    data: tasks,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...TASKS_QUERY_KEY, dueFilter, assigneeFilter],
    queryFn: () =>
      crmActivitiesApi.listTasks({
        assigneeMembershipId: assigneeFilter || undefined,
        ...(dueFilter ? { status: OPEN_TASK_STATUS, ...toTaskDueRange(dueFilter) } : {}),
      }),
  });

  const { isNewRecordModalOpen, openNewRecordModal, closeNewRecordModal } = useNewRecordModal();

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
            <Button size="sm" onClick={openNewRecordModal}>
              New task
            </Button>
          )
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {DUE_CHIPS.map(({ value, label }) => (
          <FilterChip
            key={label}
            isSelected={dueFilter === value}
            onClick={() => setDueFilter(value)}
          >
            {label}
          </FilterChip>
        ))}
        <CrmMemberFilter
          label="Filter by assignee"
          allLabel="Everyone"
          value={assigneeFilter}
          onChange={setAssigneeFilter}
        />
      </div>

      <div className="mt-4">
        {isLoading && <CompactRowSkeleton hasCheckbox />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}

        {tasks && tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {assigneeFilter
              ? "No tasks for this person here."
              : DUE_CHIPS.find(({ value }) => value === dueFilter)?.empty}
          </p>
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

      {isNewRecordModalOpen && members && (
        <NewTaskModal
          open
          onClose={closeNewRecordModal}
          members={members.map((member) => ({ id: member.id, userName: member.userName }))}
        />
      )}
    </div>
  );
};
