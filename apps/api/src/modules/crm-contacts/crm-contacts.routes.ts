import { Router } from "express";

import { crmWriteRateLimit } from "#middlewares/crm-rate-limit.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePermission, resolveTenant } from "#modules/crm-access/crm-access.middleware.js";
import { requireAdvancedCrmFeatures } from "#modules/crm-billing/crm-billing.middleware.js";

import { crmContactsController } from "./crm-contacts.controller.js";
import {
  contactIdParamsSchema,
  contactListQuerySchema,
  createContactSchema,
  updateContactSchema,
} from "./crm-contacts.schemas.js";

const CONTACTS_READ = "contacts:read";
const CONTACTS_WRITE = "contacts:write";
const CONTACTS_DELETE = "contacts:delete";

const tenantChain = [resolveTenant, requireAuth, requireAdvancedCrmFeatures] as const;
const writeChain = [...tenantChain, crmWriteRateLimit] as const;

export const crmContactsRoutes = Router();

crmContactsRoutes.get(
  "/contacts",
  ...tenantChain,
  requirePermission(CONTACTS_READ),
  validate({ query: contactListQuerySchema }),
  crmContactsController.listContacts,
);

crmContactsRoutes.post(
  "/contacts",
  ...writeChain,
  requirePermission(CONTACTS_WRITE),
  validate({ body: createContactSchema }),
  crmContactsController.createContact,
);

crmContactsRoutes.get(
  "/contacts/:contactId",
  ...tenantChain,
  requirePermission(CONTACTS_READ),
  validate({ params: contactIdParamsSchema }),
  crmContactsController.getContact,
);

crmContactsRoutes.patch(
  "/contacts/:contactId",
  ...writeChain,
  requirePermission(CONTACTS_WRITE),
  validate({ params: contactIdParamsSchema, body: updateContactSchema }),
  crmContactsController.updateContact,
);

crmContactsRoutes.delete(
  "/contacts/:contactId",
  ...writeChain,
  requirePermission(CONTACTS_DELETE),
  validate({ params: contactIdParamsSchema }),
  crmContactsController.deleteContact,
);
