import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreateCreatorCompetitionBody,
  CreatorCompetitionIdParam,
  UpdateCreatorCompetitionBody,
} from "./creatorCompetition.schemas.js";
import { creatorCompetitionService } from "./creatorCompetition.service.js";

const CREATED_STATUS = 201;

export const creatorCompetitionController = {
  async listActive(_req: Request, res: Response) {
    const competitions = await creatorCompetitionService.listActiveForViewers();
    sendSuccess(res, competitions, "Active creator competitions.");
  },

  async listAllAdmin(_req: Request, res: Response) {
    const competitions = await creatorCompetitionService.listAllAdmin();
    sendSuccess(res, competitions, "Creator competitions.");
  },

  async create(_req: Request, res: Response) {
    const body = validated.body<CreateCreatorCompetitionBody>(res);
    const competition = await creatorCompetitionService.createCompetition(body);
    sendSuccess(res, competition, "Creator competition created.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { competitionId } = validated.params<CreatorCompetitionIdParam>(res);
    const body = validated.body<UpdateCreatorCompetitionBody>(res);
    const competition = await creatorCompetitionService.updateCompetition(competitionId, body);
    sendSuccess(res, competition, "Creator competition updated.");
  },
};
