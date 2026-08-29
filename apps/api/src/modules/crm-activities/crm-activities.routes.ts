import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePermission, resolveTenant } from "#modules/crm-access/crm-access.middleware.js";
import { requireAdvancedCrmFeatures } from "#modules/crm-billing/crm-billing.middleware.js";

import { crmActivitiesController } from "./crm-activities.controller.js";
import {
  activityIdParamsSchema,
  createActivitySchema,
  createTaskSchema,
  listTasksQuerySchema,
  subjectQuerySchema,
  taskIdParamsSchema,
  timelineQuerySchema,
  updateTaskSchema,
} from "./crm-activities.schemas.js";

const ACTIVITIES_READ = "activities:read";
const ACTIVITIES_WRITE = "activities:write";
const TASKS_READ = "tasks:read";
const TASKS_WRITE = "tasks:write";

const tenantChain = [resolveTenant, requireAuth, requireAdvancedCrmFeatures] as const;

export const crmActivitiesRoutes = Router();

crmActivitiesRoutes.get(
  "/timeline",
  ...tenantChain,
  requirePermission(ACTIVITIES_READ),
  validate({ query: timelineQuerySchema }),
  crmActivitiesController.getTimeline,
);

crmActivitiesRoutes.get(
  "/activities",
  ...tenantChain,
  requirePermission(ACTIVITIES_READ),
  validate({ query: subjectQuerySchema }),
  crmActivitiesController.listActivities,
);
crmActivitiesRoutes.post(
  "/activities",
  ...tenantChain,
  requirePermission(ACTIVITIES_WRITE),
  validate({ body: createActivitySchema }),
  crmActivitiesController.logActivity,
);
crmActivitiesRoutes.delete(
  "/activities/:activityId",
  ...tenantChain,
  requirePermission(ACTIVITIES_WRITE),
  validate({ params: activityIdParamsSchema }),
  crmActivitiesController.deleteActivity,
);

crmActivitiesRoutes.get(
  "/tasks",
  ...tenantChain,
  requirePermission(TASKS_READ),
  validate({ query: listTasksQuerySchema }),
  crmActivitiesController.listTasks,
);
crmActivitiesRoutes.post(
  "/tasks",
  ...tenantChain,
  requirePermission(TASKS_WRITE),
  validate({ body: createTaskSchema }),
  crmActivitiesController.createTask,
);
crmActivitiesRoutes.patch(
  "/tasks/:taskId",
  ...tenantChain,
  requirePermission(TASKS_WRITE),
  validate({ params: taskIdParamsSchema, body: updateTaskSchema }),
  crmActivitiesController.updateTask,
);
crmActivitiesRoutes.delete(
  "/tasks/:taskId",
  ...tenantChain,
  requirePermission(TASKS_WRITE),
  validate({ params: taskIdParamsSchema }),
  crmActivitiesController.deleteTask,
);
