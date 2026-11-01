import { z } from "zod";

const connectedRecordSchemas = {
  contact: z.object({
    id: z.string(),
    name: z.string(),
    company: z.string().nullable(),
    lifecycleStage: z.string(),
  }),
  deal: z.object({
    id: z.string(),
    title: z.string(),
    value: z.number(),
    status: z.string(),
    stageName: z.string(),
  }),
  ticket: z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    status: z.string(),
  }),
  task: z.object({
    id: z.string(),
    title: z.string(),
    dueAt: z.string(),
    assigneeName: z.string(),
  }),
};

export const crmConnectionsSchema = z.object({
  people: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      handle: z.string(),
      avatarUrl: z.string().nullable(),
      role: z.enum(["partner", "customer"]),
    }),
  ),
  contacts: z.array(connectedRecordSchemas.contact).nullable(),
  deals: z.array(connectedRecordSchemas.deal).nullable(),
  tickets: z.array(connectedRecordSchemas.ticket).nullable(),
  tasks: z.array(connectedRecordSchemas.task).nullable(),
});
export type CrmConnections = z.infer<typeof crmConnectionsSchema>;
