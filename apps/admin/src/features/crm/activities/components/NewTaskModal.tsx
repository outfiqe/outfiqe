import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  DateInput,
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
import { toDateInputValue } from "@outfiqe/utils";
import { useForm } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";
import { FORM_VALIDATION_MODE } from "@/lib/formValidation";

import { CONNECTIONS_QUERY_KEY } from "../../connections/constants/connectionsQueryKeys";
import { crmActivitiesApi } from "../api/activitiesApi";
import type { CrmSubjectTypeValue } from "../api/activitiesSchemas";
import { TASKS_QUERY_KEY } from "../constants/tasksQueryKeys";
import { taskFormSchema, type TaskFormValues } from "../schemas/taskForm.schema";

export const NewTaskModal = ({
  open,
  onClose,
  members,
  subject,
}: {
  open: boolean;
  onClose: () => void;
  members: { id: string; userName: string }[];
  subject?: { subjectType: CrmSubjectTypeValue; subjectId: string };
}) => {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { title: "", assigneeMembershipId: members[0]?.id ?? "", dueAt: "" },
    mode: FORM_VALIDATION_MODE,
  });

  const create = useApiMutation({
    mutationFn: (values: TaskFormValues) =>
      crmActivitiesApi.createTask({
        title: values.title.trim(),
        assigneeMembershipId: values.assigneeMembershipId,
        ...(values.dueAt ? { dueAt: new Date(values.dueAt).toISOString() } : {}),
        ...subject,
      }),
    invalidateKeys: [TASKS_QUERY_KEY, CONNECTIONS_QUERY_KEY],
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
              <FormItem className="mt-0 space-y-1.5">
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
              <FormItem className="mt-0 space-y-1.5">
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
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">
                  Due date (optional)
                </FormLabel>
                <FormControl>
                  <DateInput min={toDateInputValue()} {...field} />
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
