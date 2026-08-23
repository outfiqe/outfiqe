import express, { Router } from "express";

import { facebookWebhooksController } from "./facebook.webhooks.controller.js";

const parseFacebookWebhookBody = express.urlencoded({ extended: false });

export const facebookWebhookRoutes = Router();

facebookWebhookRoutes.post(
  "/deauthorize",
  parseFacebookWebhookBody,
  facebookWebhooksController.deauthorize,
);

facebookWebhookRoutes.post(
  "/data-deletion",
  parseFacebookWebhookBody,
  facebookWebhooksController.dataDeletion,
);
