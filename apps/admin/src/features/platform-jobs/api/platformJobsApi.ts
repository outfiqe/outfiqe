import { apiClient } from "@/lib/apiClient";

import { type JobsHealth, jobsHealthSchema, retriedJobsSchema } from "./platformJobsSchemas";

export const JOBS_HEALTH_QUERY_KEY = ["platform-jobs-health"];

export const platformJobsApi = {
  async getHealth(): Promise<JobsHealth> {
    const res = await apiClient.get<JobsHealth>("/platform/jobs");
    return jobsHealthSchema.parse(res.data);
  },

  async retryOutboxEvent(eventId: string): Promise<void> {
    await apiClient.post(`/platform/jobs/outbox/${eventId}/retry`);
  },

  async retryFailedJobs(queueName: string): Promise<number> {
    const res = await apiClient.post(`/platform/jobs/queues/${queueName}/retry-failed`);
    return retriedJobsSchema.parse(res.data).retriedCount;
  },
};
