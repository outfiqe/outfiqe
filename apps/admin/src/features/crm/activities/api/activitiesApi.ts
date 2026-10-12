import { apiClient } from "@/lib/apiClient";

import {
  type CrmActivityTypeValue,
  type CrmSubjectTypeValue,
  type Task,
  taskListSchema,
  taskSchema,
  type TaskStatusValue,
  type Timeline,
  timelineSchema,
} from "./activitiesSchemas";

type Subject = { subjectType: CrmSubjectTypeValue; subjectId: string };

export const crmActivitiesApi = {
  async getTimeline(subject: Subject): Promise<Timeline> {
    const res = await apiClient.get<Timeline>("/crm/timeline", { params: subject });
    return timelineSchema.parse(res.data);
  },

  async logActivity(
    subject: Subject,
    input: { type: CrmActivityTypeValue; body: string },
  ): Promise<void> {
    await apiClient.post("/crm/activities", { ...subject, ...input });
  },

  async listTasks(
    filters: {
      assigneeMembershipId?: string;
      status?: TaskStatusValue;
    } = {},
  ): Promise<Task[]> {
    const res = await apiClient.get<Task[]>("/crm/tasks", { params: filters });
    return taskListSchema.parse(res.data);
  },

  async createTask(input: {
    title: string;
    assigneeMembershipId: string;
    dueAt?: string;
    description?: string | null;
    subjectType?: CrmSubjectTypeValue;
    subjectId?: string;
  }): Promise<Task> {
    const res = await apiClient.post<Task>("/crm/tasks", input);
    return taskSchema.parse(res.data);
  },

  async updateTask(
    taskId: string,
    input: {
      status?: TaskStatusValue;
      title?: string;
      assigneeMembershipId?: string;
      dueAt?: string;
    },
  ): Promise<Task> {
    const res = await apiClient.patch<Task>(`/crm/tasks/${taskId}`, input);
    return taskSchema.parse(res.data);
  },

  async deleteTask(taskId: string): Promise<void> {
    await apiClient.del(`/crm/tasks/${taskId}`);
  },
};
